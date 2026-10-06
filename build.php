<?php
/**
 * Genera la web estática en la carpeta _site/.
 * Uso:  php build.php
 * GitHub Actions lo ejecuta cada hora con las claves de Amazon como Secrets.
 */

define('ROOT_DIR', __DIR__);
define('DATA_DIR', __DIR__ . '/data');
date_default_timezone_set('Europe/Madrid');
mb_internal_encoding('UTF-8');

require ROOT_DIR . '/inc/funciones.php';
require ROOT_DIR . '/inc/amazon.php';

$OUT = ROOT_DIR . '/_site';
$site = cfg()['site_name'];

// Carpeta limpia + caché vacía (precios siempre recién pedidos).
function rrmdir(string $d): void { if (!is_dir($d)) return; foreach (scandir($d) as $f) { if ($f === '.' || $f === '..') continue; $p = "$d/$f"; is_dir($p) ? rrmdir($p) : unlink($p); } rmdir($d); }
rrmdir($OUT); rrmdir(DATA_DIR . '/cache');
mkdir($OUT, 0777, true); mkdir(DATA_DIR . '/cache', 0777, true);

function out(string $rel, string $html): void
{
    global $OUT;
    $f = "$OUT/$rel";
    if (!is_dir(dirname($f))) mkdir(dirname($f), 0777, true);
    file_put_contents($f, $html);
}
function capture(string $tpl, array $vars): string { ob_start(); page($tpl, $vars); return ob_get_clean(); }

// 1) Pedir a Amazon los datos de todos los productos de una vez.
$prods = productos();
$amz = amz_items(array_column($prods, 'asin'));
$conPrecio = count(array_filter($amz, 'precio_valido'));
echo amz_configured() ? "Amazon: $conPrecio/" . count($prods) . " productos con precio\n" : "Amazon: sin credenciales, se publica sin precios\n";

// 2) Páginas
out('index.html', capture('inicio', [
    'title' => 'Comparador de precios y chollos de Amazon | ' . $site,
    'description' => 'Compara productos de Amazon, consulta precios actualizados y encuentra alternativas más baratas o mejor valoradas antes de comprar.',
    'canonical' => url(), 'prods' => $prods, 'amz' => $amz, 'guias' => array_slice(guias(), 0, 3),
]));

out('comparar.html', capture('comparar', ['title' => 'Comparador de productos de Amazon | ' . $site, 'noindex' => true, 'amz' => $amz]));

out('categorias.html', capture('categorias', ['title' => 'Categorías | ' . $site, 'description' => 'Explora los chollos y productos destacados por categorías.', 'canonical' => url('categorias')]));

foreach (categorias() as $slug => $c) {
    $cp = productos($slug);
    out("categoria/$slug.html", capture('categoria', [
        'title' => $c['nombre'] . ': chollos y productos destacados | ' . $site,
        'description' => 'Selección de productos de ' . mb_strtolower($c['nombre']) . ' en Amazon con precios actualizados.',
        'canonical' => url('categoria/' . $slug), 'cat' => $c, 'prods' => $cp, 'amz' => $amz,
    ]));
}

foreach ($prods as $p) {
    $rel = array_slice(array_values(array_filter(productos($p['categoria']), fn($x) => $x['asin'] !== $p['asin'])), 0, 4);
    out('producto/' . $p['asin'] . '.html', capture('producto', [
        'title' => $p['titulo'] . ' | ' . $site, 'description' => mb_substr($p['descripcion'], 0, 155),
        'canonical' => url('producto/' . $p['asin']), 'p' => $p, 'amz' => $amz[$p['asin']] ?? null, 'rel' => $rel, 'relAmz' => $amz,
    ]));
}

out('guias/index.html', capture('guias', ['title' => 'Guías de compra | ' . $site, 'description' => 'Guías originales para elegir bien antes de comprar en Amazon.', 'canonical' => url('guias/'), 'guias' => guias()]));
foreach (guias() as $g) {
    out('guias/' . $g['slug'] . '.html', capture('guia', [
        'title' => $g['titulo'] . ' | ' . $site, 'description' => $g['descripcion'], 'canonical' => url('guias/' . $g['slug']), 'g' => $g,
    ]));
}

$legales = ['aviso-legal' => 'Aviso legal', 'privacidad' => 'Política de privacidad', 'cookies' => 'Política de cookies', 'condiciones' => 'Condiciones de uso'];
foreach ($legales as $slug => $t) out("$slug.html", capture("legal/$slug", ['title' => "$t | $site", 'canonical' => url($slug)]));
out('contacto.html', capture('contacto', ['title' => 'Contacto | ' . $site, 'canonical' => url('contacto')]));
out('404.html', capture('404', ['title' => 'Página no encontrada | ' . $site, 'noindex' => true]));

// 3) Sitemap, robots, dominio y recursos
$urls = [url(), url('categorias'), url('guias/')];
foreach (categorias() as $c) $urls[] = url('categoria/' . $c['slug']);
foreach ($prods as $p) $urls[] = url('producto/' . $p['asin']);
foreach (guias() as $g) $urls[] = url('guias/' . $g['slug']);
foreach (array_merge(array_keys($legales), ['contacto']) as $l) $urls[] = url($l);
$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $u) $xml .= '  <url><loc>' . e($u) . "</loc></url>\n";
out('sitemap.xml', $xml . '</urlset>' . "\n");
out('robots.txt', "User-agent: *\nDisallow: /comparar\nSitemap: " . url('sitemap.xml') . "\n");
out('CNAME', parse_url(cfg()['site_url'], PHP_URL_HOST) . "\n");
out('.nojekyll', '');
foreach (glob(ROOT_DIR . '/assets/*') as $f) out('assets/' . basename($f), file_get_contents($f));

echo 'Web generada en _site/ (' . count($urls) . " páginas)\n";
