<?php
/** Funciones comunes de la web. */

function cfg(): array
{
    static $c = null;
    if ($c === null) {
        $file = ROOT_DIR . '/config.php';
        if (!is_file($file)) $file = ROOT_DIR . '/config.example.php';
        $c = require $file;
    }
    return $c;
}

function e($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function url(string $path = ''): string
{
    return rtrim(cfg()['site_url'], '/') . '/' . ltrim($path, '/');
}

function read_json(string $file, $default = [])
{
    if (!is_file($file)) return $default;
    $d = json_decode((string) file_get_contents($file), true);
    return $d === null ? $default : $d;
}

function write_json(string $file, $data): bool
{
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false;
}

/** Ajustes editables desde el panel (data/ajustes.json). aj('textos.hero_texto') */
function aj(string $path, $default = '')
{
    static $a = null;
    if ($a === null) $a = read_json(DATA_DIR . '/ajustes.json');
    $v = $a;
    foreach (explode('.', $path) as $k) {
        if (!is_array($v) || !array_key_exists($k, $v)) return $default;
        $v = $v[$k];
    }
    return ($v === '' || $v === null) ? $default : $v;
}

function paginas(): array
{
    $p = [];
    foreach (glob(DATA_DIR . '/paginas/*.json') as $f) $p[] = read_json($f);
    usort($p, fn($a, $b) => strcmp($a['titulo'], $b['titulo']));
    return $p;
}

/** Color hexadecimal seguro para CSS. */
function color(string $c, string $def): string
{
    return preg_match('/^#[0-9a-fA-F]{3,8}$/', $c) ? $c : $def;
}

function categorias(): array
{
    $out = [];
    foreach (read_json(DATA_DIR . '/categorias.json') as $c) $out[$c['slug']] = $c;
    return $out;
}

function productos(?string $categoria = null): array
{
    $p = read_json(DATA_DIR . '/productos.json');
    if ($categoria) $p = array_values(array_filter($p, fn($x) => $x['categoria'] === $categoria));
    return $p;
}

function producto(string $asin): ?array
{
    foreach (productos() as $p) if ($p['asin'] === $asin) return $p;
    return null;
}

function guias(): array
{
    $g = [];
    foreach (glob(DATA_DIR . '/guias/*.json') as $f) $g[] = read_json($f);
    usort($g, fn($a, $b) => strcmp($b['fecha'], $a['fecha']));
    return $g;
}

function guia(string $slug): ?array
{
    $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
    $f = DATA_DIR . "/guias/$slug.json";
    return is_file($f) ? read_json($f) : null;
}

/** Enlace de afiliado limpio a la ficha de Amazon. */
function amazon_link(string $asin): string
{
    return 'https://' . cfg()['marketplace'] . '/dp/' . rawurlencode($asin) . '?tag=' . rawurlencode(cfg()['partner_tag']);
}

/** Enlace de búsqueda en Amazon con tu ID (sort: price-asc-rank, review-rank, exact-aware-popularity-rank). */
function amazon_search_link(string $q, string $sort = ''): string
{
    $u = 'https://' . cfg()['marketplace'] . '/s?k=' . rawurlencode($q) . '&tag=' . rawurlencode(cfg()['partner_tag']);
    return $sort ? $u . '&s=' . rawurlencode($sort) : $u;
}

/** Saca el ASIN de un enlace de Amazon o de un ASIN suelto. */
function extract_asin(string $input): ?string
{
    $input = trim($input);
    if (preg_match('/^[A-Z0-9]{10}$/i', $input)) return strtoupper($input);
    if (preg_match('~/(?:dp|gp/product|gp/aw/d|product|ASIN)/([A-Z0-9]{10})~i', $input, $m)) return strtoupper($m[1]);
    return null;
}

function fecha_es(string $ymd): string
{
    $m = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $t = strtotime($ymd);
    return date('j', $t) . ' ' . $m[(int) date('n', $t)] . ' ' . date('Y', $t);
}

/** ¿Se puede mostrar el precio? Amazon exige que tenga menos de 24 h. */
function precio_valido(?array $amz): bool
{
    return $amz && !empty($amz['price']) && ($amz['fetched_at'] ?? 0) > time() - 86400;
}

function hora_precio(array $amz): string
{
    return date('d/m/Y H:i', (int) $amz['fetched_at']);
}

/** Iconos de línea (SVG propio). */
function icon(string $name, int $size = 24): string
{
    $p = [
        'etiqueta'       => '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
        'halloween'      => '<path d="M12 6c-1-2 0-3 1-3"/><path d="M12 6c-4-1-8 2-8 7s3 7 8 7 8-2 8-7-4-8-8-7z"/><path d="M8 11l1.5 1.5L11 11M13 11l1.5 1.5L16 11M8.5 15.5c2 1.2 5 1.2 7 0"/>',
        'suplementacion' => '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M8 3h8v4H8zM9 12h6M9 15h6M9 18h4"/>',
        'motor'          => '<path d="M3 16v-3l2-5h14l2 5v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M5 13h14"/>',
        'tecnologia'     => '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
        'hogar'          => '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
        'cocina'         => '<path d="M7 14a4 4 0 01-1-7.9A5 5 0 0116 5a4 4 0 012 7.6V14z"/><path d="M7 14v6h10v-6M7 17h10"/>',
        'deportes'       => '<path d="M6 8v8M3.5 10v4M18 8v8M20.5 10v4M6 12h12"/>',
        'belleza'        => '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
        'moda'           => '<path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c0 2-1.5 3-4 3S8 5 8 3z"/>',
        'bricolaje'      => '<path d="M14.5 6.5a4 4 0 00-5.3 5.2L3.5 17.5l3 3 5.8-5.7a4 4 0 005.2-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>',
        'juguetes'       => '<rect x="4" y="9" width="16" height="11" rx="1"/><circle cx="8" cy="7" r="1.6"/><circle cx="16" cy="7" r="1.6"/><path d="M4 14h16"/>',
        'box'            => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
        'search'         => '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
        'link'           => '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
        'cart'           => '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
        'share'          => '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
        'coin'           => '<circle cx="9" cy="14" r="6"/><path d="M15 4.3A6 6 0 0121 10a6 6 0 01-4 5.7M9 11v6M7 12.5h3a1.5 1.5 0 010 3H8"/>',
        'star'           => '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
        'chart'          => '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
        'gift'           => '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
        'fire'           => '<path d="M12 21c4 0 7-2.5 7-6.5 0-3-2-5.5-3.5-7-.3 2-1.5 3-2.5 3 .5-3-1-6.5-4-8 .3 3-1.5 5-3 7S5 12.5 5 14.5C5 18.5 8 21 12 21z"/><path d="M12 21c-1.8 0-3-1.2-3-3 0-2 2-3 2.5-5 1.5 1 3.5 2.6 3.5 5 0 1.8-1.2 3-3 3z"/>',
        'check'          => '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'clock'          => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'arrow'          => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'menu'           => '<path d="M4 7h16M4 12h16M4 17h16"/>',
    ];
    if ($name === '__list') return implode(',', array_keys($p));
    $p = $p[$name] ?? '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>';
    return '<svg class="ico" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}

/** Tiras de la portada configuradas en el panel (ajustes.secciones). Si no hay, se generan solas. */
function secciones_portada(array $prods, array $amz): array
{
    $cfg = aj('secciones', []);
    if (!is_array($cfg) || !$cfg) {
        $cfg = [['titulo' => 'Ofertas', 'tipo' => 'ofertas'], ['titulo' => 'Novedades', 'tipo' => 'novedades']];
        foreach (categorias() as $c) $cfg[] = ['titulo' => $c['nombre'], 'tipo' => 'categoria', 'categoria' => $c['slug']];
    }
    $visibles = array_values(array_filter($prods, fn($p) => ($p['destacado'] ?? true) !== false));
    $porAsin = [];
    foreach ($prods as $p) $porAsin[$p['asin']] = $p;
    $out = [];
    foreach ($cfg as $s) {
        if (!empty($s['oculta'])) continue;
        $n = max(1, min(20, (int) ($s['cantidad'] ?? 5)));
        $tipo = $s['tipo'] ?? 'categoria';
        $lista = [];
        $link = null;
        if ($tipo === 'ofertas') {
            $lista = array_values(array_filter($visibles, fn($p) => precio_valido($amz[$p['asin']] ?? null) && !empty($amz[$p['asin']]['savings_pct'])));
            usort($lista, fn($a, $b) => ($amz[$b['asin']]['savings_pct'] ?? 0) <=> ($amz[$a['asin']]['savings_pct'] ?? 0));
        } elseif ($tipo === 'novedades') {
            $lista = array_reverse($visibles);
            usort($lista, fn($a, $b) => strcmp($b['alta'] ?? '', $a['alta'] ?? ''));
        } elseif ($tipo === 'manual') {
            foreach ((array) ($s['asins'] ?? []) as $a) if (isset($porAsin[$a])) $lista[] = $porAsin[$a];
        } else {
            $slug = $s['categoria'] ?? '';
            $lista = array_reverse(array_values(array_filter($visibles, fn($p) => $p['categoria'] === $slug)));
            $link = '/categoria/' . $slug;
        }
        $lista = array_slice($lista, 0, $n);
        if (!$lista) continue;
        $out[] = ['titulo' => $s['titulo'] ?? '', 'tipo' => $tipo, 'productos' => $lista, 'link' => $link];
    }
    return $out;
}

/** Etiqueta honesta para la tarjeta (sin inventar "más vendido"). */
function etiqueta(?array $p, ?array $amz): ?array
{
    if (precio_valido($amz) && !empty($amz['savings_pct'])) return ['OFERTA', 'red'];
    if ($p && !empty($p['alta']) && strtotime($p['alta']) > time() - 21 * 86400) return ['NOVEDAD', 'green'];
    return null;
}

/** Tarjeta de producto. $p = producto propio (puede ser null), $amz = datos de Amazon, $n = número. */
function tarjeta(?array $p, ?array $amz, int $n = 0): string
{
    $asin  = $p['asin'] ?? $amz['asin'];
    $title = $p['titulo'] ?? ($amz['title'] ?? $asin);
    $cats  = categorias();
    $cat   = $p ? ($cats[$p['categoria']]['nombre'] ?? '') : '';
    $img   = $amz['image'] ?? ($p['imagen'] ?? null);
    $link  = amazon_link($asin);
    $page  = $p ? '/producto/' . $asin : $link;
    $ext   = $p ? '' : ' rel="sponsored nofollow noopener" target="_blank"';
    $tag   = etiqueta($p, $amz);
    ob_start(); ?>
    <article class="card" data-cat="<?= e($p['categoria'] ?? '') ?>" data-q="<?= e(mb_strtolower($title . ' ' . $cat)) ?>">
      <div class="card-top">
        <?php if ($n): ?><span class="num"><?= $n ?></span><?php endif; ?>
        <?php if ($tag): ?><span class="lbl lbl-<?= $tag[1] ?>"><?= e($tag[0]) ?></span><?php endif; ?>
      </div>
      <a class="card-img" href="<?= e($page) ?>"<?= $ext ?>>
        <?php if ($img): ?><img src="<?= e($img) ?>" alt="<?= e($title) ?>" loading="lazy"><?php else: ?><span class="noimg"><?= icon('box', 48) ?></span><?php endif; ?>
      </a>
      <div class="card-body">
        <?php if ($cat): ?><span class="tag"><?= e($cat) ?></span><?php endif; ?>
        <h3><a href="<?= e($page) ?>"<?= $ext ?>><?= e($title) ?></a></h3>
        <div class="price-box">
          <?php if (precio_valido($amz)): ?>
            <span class="price"><?= e($amz['price']) ?></span>
            <?php if (!empty($amz['old_price'])): ?><s class="old"><?= e($amz['old_price']) ?></s><?php endif; ?>
            <?php if (!empty($amz['savings_pct'])): ?><span class="disc">-<?= (int) $amz['savings_pct'] ?>%</span><?php endif; ?>
            <small class="when"><?= icon('clock', 13) ?> Precio a <?= e(hora_precio($amz)) ?> <span class="info" tabindex="0" title="Los precios y la disponibilidad pueden cambiar. Se aplica el precio que figure en Amazon en el momento de la compra.">ⓘ</span></small>
          <?php else: ?>
            <span class="price muted">Consulta el precio en Amazon</span>
          <?php endif; ?>
        </div>
        <div class="card-actions">
          <a class="btn btn-buy" href="<?= e($link) ?>" rel="sponsored nofollow noopener" target="_blank">Comprar <?= icon('cart', 16) ?></a>
          <button type="button" class="btn btn-ghost share" data-url="<?= e($p ? url('producto/' . $asin) : $link) ?>" data-title="<?= e($title) ?>"><?= icon('share', 15) ?> Compartir</button>
        </div>
      </div>
    </article>
    <?php return ob_get_clean();
}

function render(string $tpl, array $vars = []): void
{
    extract($vars);
    require ROOT_DIR . "/plantillas/$tpl.php";
}

function page(string $tpl, array $vars = []): void
{
    $vars += ['title' => cfg()['site_name'], 'description' => '', 'canonical' => null, 'noindex' => false, 'schema' => null];
    render('cabecera', $vars);
    render($tpl, $vars);
    render('pie', $vars);
}

function not_found(): void
{
    http_response_code(404);
    page('404', ['title' => 'Página no encontrada | ' . cfg()['site_name'], 'noindex' => true]);
    exit;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}

function csrf_ok(): bool
{
    return !empty($_POST['csrf']) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $_POST['csrf']);
}
