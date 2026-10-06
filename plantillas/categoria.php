<section class="wrap section">
  <p class="crumbs"><a href="/">Inicio</a> › <a href="/categorias">Categorías</a> › <?= e($cat['nombre']) ?></p>
  <h1><?= e($cat['icono']) ?> <?= e($cat['nombre']) ?></h1>
  <?php if ($prods): ?>
    <div class="grid">
      <?php foreach (array_reverse($prods) as $p) echo tarjeta($p, $amz[$p['asin']] ?? null); ?>
    </div>
  <?php else: ?>
    <div class="notice">Todavía no hay productos en esta categoría. Mientras tanto, puedes <a href="<?= e(amazon_search_link($cat['nombre'])) ?>" rel="sponsored nofollow noopener" target="_blank">buscar <?= e(mb_strtolower($cat['nombre'])) ?> en Amazon</a>.</div>
  <?php endif; ?>
</section>
