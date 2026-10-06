<?php
/**
 * Cliente mínimo para la Amazon Creators API (versión 3.x, región EU).
 * - Obtiene y guarda el token OAuth (dura 1 hora).
 * - Consulta productos (getItems) en lotes de 10 y los guarda en caché.
 * - Si la API falla, devuelve lo último guardado (las plantillas ocultan
 *   el precio si tiene más de 24 h, como exige Amazon).
 */

const AMZ_RESOURCES = [
    'images.primary.large',
    'images.primary.medium',
    'itemInfo.title',
    'itemInfo.features',
    'itemInfo.byLineInfo',
    'offersV2.listings.price',
    'offersV2.listings.availability',
    'offersV2.listings.dealDetails',
    'offersV2.listings.isBuyBoxWinner',
];

/** Lee una ruta "a.b.c" aceptando claves en camelCase o PascalCase. */
function amz_get($data, string $path, $default = null)
{
    foreach (explode('.', $path) as $key) {
        if (!is_array($data)) return $default;
        if (array_key_exists($key, $data)) { $data = $data[$key]; continue; }
        $alt = ucfirst($key);
        if (array_key_exists($alt, $data)) { $data = $data[$alt]; continue; }
        return $default;
    }
    return $data;
}

function amz_configured(): bool
{
    $c = cfg();
    return !empty($c['api_client_id']) && !empty($c['api_client_secret'])
        && strpos($c['api_client_id'], 'PEGA_AQUI') === false
        && strpos($c['api_client_secret'], 'PEGA_AQUI') === false;
}

function amz_log(string $msg): void
{
    @file_put_contents(DATA_DIR . '/cache/api.log', date('c') . ' ' . $msg . "\n", FILE_APPEND);
}

function amz_http_post(string $url, array $headers, string $body): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$code, $resp === false ? '' : $resp, $err];
}

function amz_token(bool $force = false): ?string
{
    $file = DATA_DIR . '/cache/token.json';
    if (!$force && is_file($file)) {
        $t = json_decode((string) file_get_contents($file), true);
        if (!empty($t['access_token']) && ($t['expires_at'] ?? 0) > time() + 60) {
            return $t['access_token'];
        }
    }
    $c = cfg();
    $id = trim($c['api_client_id']);
    $secret = trim($c['api_client_secret']);
    $scope = 'creatorsapi::default';
    // Amazon documenta varios formatos; se prueban en orden hasta que uno funcione.
    $intentos = [
        'json' => [['Content-Type: application/json'], json_encode([
            'grant_type' => 'client_credentials', 'client_id' => $id, 'client_secret' => $secret, 'scope' => $scope])],
        'form' => [['Content-Type: application/x-www-form-urlencoded'], http_build_query([
            'grant_type' => 'client_credentials', 'client_id' => $id, 'client_secret' => $secret, 'scope' => $scope])],
        'basic' => [['Content-Type: application/x-www-form-urlencoded', 'Authorization: Basic ' . base64_encode("$id:$secret")],
            http_build_query(['grant_type' => 'client_credentials', 'scope' => $scope])],
    ];
    $j = null;
    foreach ($intentos as $modo => [$headers, $body]) {
        [$code, $resp, $err] = amz_http_post($c['api_token_url'], $headers, $body);
        $j = json_decode($resp, true);
        if ($code === 200 && !empty($j['access_token'])) { amz_log("TOKEN OK ($modo)"); break; }
        amz_log("TOKEN ERROR ($modo) http=$code err=$err body=" . substr($resp, 0, 300));
        $j = null;
    }
    if (!$j) {
        amz_log('Datos usados: ID empieza por "' . substr($id, 0, 29) . '" (' . strlen($id) . ' caracteres), secreto de ' . strlen($secret) . ' caracteres.');
        return null;
    }
    file_put_contents($file, json_encode([
        'access_token' => $j['access_token'],
        'expires_at'   => time() + (int) ($j['expires_in'] ?? 3600),
    ]), LOCK_EX);
    return $j['access_token'];
}

/** Llamada genérica a la API (p. ej. '/catalog/v1/getItems'). */
function amz_call(string $path, array $payload): ?array
{
    if (!amz_configured()) return null;
    $c = cfg();
    $payload += ['marketplace' => $c['marketplace'], 'partnerTag' => $c['partner_tag']];
    for ($try = 0; $try < 2; $try++) {
        $token = amz_token($try > 0);
        if (!$token) return null;
        [$code, $resp, $err] = amz_http_post($c['api_base_url'] . $path, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'x-marketplace: ' . $c['marketplace'],
        ], json_encode($payload));
        if ($code === 401 && $try === 0) continue; // token caducado: reintenta
        $j = json_decode($resp, true);
        if ($code !== 200 || !is_array($j)) {
            amz_log("API ERROR $path http=$code err=$err body=" . substr($resp, 0, 800));
            return is_array($j) ? $j : null;
        }
        if (!empty($j['errors'])) amz_log("API AVISO $path " . json_encode($j['errors']));
        return $j;
    }
    return null;
}

/** Convierte un item de la API en un array sencillo para las plantillas. */
function amz_normalize(array $it): array
{
    $listing = null;
    foreach ((array) amz_get($it, 'offersV2.listings', []) as $l) {
        if ($listing === null || amz_get($l, 'isBuyBoxWinner')) $listing = $l;
        if (amz_get($l, 'isBuyBoxWinner')) break;
    }
    $img = amz_get($it, 'images.primary.large.url') ?: amz_get($it, 'images.primary.medium.url');
    return [
        'asin'         => amz_get($it, 'asin'),
        'title'        => amz_get($it, 'itemInfo.title.displayValue'),
        'brand'        => amz_get($it, 'itemInfo.byLineInfo.brand.displayValue'),
        'features'     => array_slice((array) amz_get($it, 'itemInfo.features.displayValues', []), 0, 5),
        'url'          => amz_get($it, 'detailPageURL'),
        'image'        => $img,
        'price'        => $listing ? amz_get($listing, 'price.money.displayAmount') : null,
        'amount'       => $listing ? amz_get($listing, 'price.money.amount') : null,
        'old_price'    => $listing ? amz_get($listing, 'price.savingBasis.money.displayAmount') : null,
        'savings_pct'  => $listing ? amz_get($listing, 'price.savings.percentage') : null,
        'availability' => $listing ? amz_get($listing, 'availability.type') : null,
        'deal'         => $listing ? (bool) amz_get($listing, 'dealDetails') : false,
        'fetched_at'   => time(),
    ];
}

function amz_cache_file(string $asin): string
{
    return DATA_DIR . '/cache/item_' . preg_replace('/[^A-Z0-9]/', '', $asin) . '.json';
}

/**
 * Devuelve datos de Amazon para una lista de ASIN: [asin => datos|null].
 * Usa la caché si es reciente y pide el resto a la API en lotes de 10.
 */
function amz_items(array $asins): array
{
    $ttl = (int) (cfg()['price_cache_ttl'] ?? 3600);
    $out = [];
    $missing = [];
    foreach (array_unique($asins) as $a) {
        $f = amz_cache_file($a);
        $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
        $out[$a] = $d;
        if (!$d || ($d['fetched_at'] ?? 0) < time() - $ttl) $missing[] = $a;
    }
    // Si la API falló hace poco, no reintentar en cada visita (evita webs lentas).
    $lock = DATA_DIR . '/cache/api_fail.lock';
    if ($missing && amz_configured() && !(is_file($lock) && filemtime($lock) > time() - 300)) {
        foreach (array_chunk($missing, 10) as $chunk) {
            $r = amz_call('/catalog/v1/getItems', [
                'itemIds'    => $chunk,
                'itemIdType' => 'ASIN',
                'resources'  => AMZ_RESOURCES,
            ]);
            $items = (array) amz_get($r, 'itemsResult.items', []);
            if ($r === null || (!$items && !empty($r['errors']))) { @touch($lock); break; }
            foreach ($items as $it) {
                $n = amz_normalize($it);
                if (!$n['asin']) continue;
                $out[$n['asin']] = $n;
                file_put_contents(amz_cache_file($n['asin']), json_encode($n, JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
        }
    }
    return $out;
}

/** Búsqueda por palabras clave (para el comparador). */
function amz_search(string $keywords, int $count = 6, string $sortBy = ''): array
{
    $key = DATA_DIR . '/cache/search_' . md5($keywords . '|' . $sortBy) . '.json';
    if (is_file($key) && filemtime($key) > time() - (int) (cfg()['price_cache_ttl'] ?? 3600)) {
        return json_decode((string) file_get_contents($key), true) ?: [];
    }
    $payload = [
        'keywords'  => mb_substr($keywords, 0, 120),
        'itemCount' => $count,
        'resources' => AMZ_RESOURCES,
    ];
    if ($sortBy) $payload['sortBy'] = $sortBy;
    $r = amz_call('/catalog/v1/searchItems', $payload);
    $res = [];
    foreach ((array) amz_get($r, 'searchResult.items', []) as $it) {
        $res[] = amz_normalize($it);
    }
    if ($res) file_put_contents($key, json_encode($res, JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $res;
}
