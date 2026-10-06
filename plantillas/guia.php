<?php
$cat = categorias()[$g['categoria']] ?? null;
// Productos recomendados: los que indique la guía o, si no, los de su categoría.
$recos = [];
foreach ($g['productos'] ?? [] as $a) if ($x = producto($a)) $recos[] = $x;
if (!$recos && $cat) $recos = array_slice(productos($cat['slug']), 0, 3);
$recosAmz = amz_items(array_column($recos, 'asin'));
?>
<article class="wrap section article">
  <p class="crumbs"><a href="/">Inicio</a> › <a href="/guias/">Guías</a> › <?= e($cat['nombre'] ?? '') ?></p>
  <span class="tag"><?= e($cat['nombre'] ?? '') ?> · Publicada el <?= e(fecha_es($g['fecha'])) ?></span>
  <h1><?= e($g['titulo']) ?></h1>
  <p class="lead"><?= e($g['descripcion']) ?></p>
  <div class="prose"><?= $g['html'] /* contenido propio de confianza */ ?></div>

  <?php if (!empty($g['busqueda'])): ?>
    <div class="cta-box">
      <p><b>¿Ya sabes lo que buscas?</b> Mira las opciones disponibles en Amazon:</p>
      <a class="btn" href="<?= e(amazon_search_link($g['busqueda'], 'review-rank')) ?>" rel="sponsored nofollow noopener" target="_blank">Ver los mejor valorados</a>
      <a class="btn btn-ghost" href="<?= e(amazon_search_link($g['busqueda'], 'price-asc-rank')) ?>" rel="sponsored nofollow noopener" target="_blank">Ver los más baratos</a>
    </div>
  <?php endif; ?>

  <?php if ($recos): ?>
    <h2>Productos de nuestra selección</h2>
    <div class="grid">
      <?php foreach ($recos as $r) echo tarjeta($r, $recosAmz[$r['asin']] ?? null); ?>
    </div>
  <?php endif; ?>

  <p class="small">Esta guía es contenido editorial propio. Algunos enlaces son enlaces de afiliado: Todo Chollos Online puede obtener ingresos por compras adscritas que cumplan los requisitos aplicables.</p>
</article>
