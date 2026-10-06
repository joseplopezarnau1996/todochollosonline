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

/** Tarjeta de producto. $p = producto propio (puede ser null), $amz = datos de Amazon. */
function tarjeta(?array $p, ?array $amz): string
{
    $asin  = $p['asin'] ?? $amz['asin'];
    $title = $p['titulo'] ?? ($amz['title'] ?? $asin);
    $desc  = $p['descripcion'] ?? '';
    $cats  = categorias();
    $cat   = $p ? ($cats[$p['categoria']]['nombre'] ?? '') : '';
    $img   = $amz['image'] ?? null;
    $link  = amazon_link($asin);
    ob_start(); ?>
    <article class="card" data-cat="<?= e($p['categoria'] ?? '') ?>">
      <a class="card-img" href="<?= $p ? '/producto/' . e($asin) : e($link) ?>" <?= $p ? '' : 'rel="sponsored nofollow noopener" target="_blank"' ?>>
        <?php if ($img): ?><img src="<?= e($img) ?>" alt="<?= e($title) ?>" loading="lazy"><?php else: ?><span class="noimg">🛍️</span><?php endif; ?>
        <?php if (precio_valido($amz) && !empty($amz['savings_pct'])): ?><span class="badge">-<?= (int) $amz['savings_pct'] ?>%</span><?php endif; ?>
      </a>
      <div class="card-body">
        <?php if ($cat): ?><span class="tag"><?= e($cat) ?></span><?php endif; ?>
        <h3><?= $p ? '<a href="' . '/producto/' . e($asin) . '">' . e($title) . '</a>' : e($title) ?></h3>
        <?php if ($desc): ?><p class="desc"><?= e($desc) ?></p><?php endif; ?>
        <div class="price-box">
          <?php if (precio_valido($amz)): ?>
            <span class="price"><?= e($amz['price']) ?></span>
            <?php if (!empty($amz['old_price'])): ?><s class="old"><?= e($amz['old_price']) ?></s><?php endif; ?>
            <small class="when">Precio a <?= e(hora_precio($amz)) ?> <button type="button" class="info" title="Los precios y la disponibilidad pueden cambiar. El precio que se aplica es el que aparece en Amazon en el momento de la compra.">ⓘ</button></small>
          <?php else: ?>
            <span class="price muted">Consulta el precio en Amazon</span>
          <?php endif; ?>
        </div>
        <a class="btn" href="<?= e($link) ?>" rel="sponsored nofollow noopener" target="_blank">Ver en Amazon</a>
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
