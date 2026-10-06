<?php
$cat = categorias()[$p['categoria']] ?? null;
$title = $p['titulo'];
$link = amazon_link($p['asin']);
?>
<section class="wrap section">
  <p class="crumbs"><a href="/">Inicio</a> › <?php if ($cat): ?><a href="/categoria/<?= e($cat['slug']) ?>"><?= e($cat['nombre']) ?></a> › <?php endif; ?><?= e(mb_strimwidth($title, 0, 60, '…')) ?></p>
  <div class="product">
    <div class="product-img">
      <?php if (!empty($amz['image'])): ?><img src="<?= e($amz['image']) ?>" alt="<?= e($title) ?>"><?php else: ?><span class="noimg"><?= icon('box', 80) ?></span><?php endif; ?>
    </div>
    <div class="product-info">
      <?php if ($cat): ?><span class="tag"><?= e($cat['nombre']) ?></span><?php endif; ?>
      <h1><?= e($title) ?></h1>
      <?php if (!empty($amz['brand'])): ?><p class="brand">Marca: <?= e($amz['brand']) ?></p><?php endif; ?>
      <p class="lead"><?= e($p['descripcion']) ?></p>
      <div class="price-box big">
        <?php if (precio_valido($amz)): ?>
          <span class="price"><?= e($amz['price']) ?></span>
          <?php if (!empty($amz['old_price'])): ?><s class="old"><?= e($amz['old_price']) ?></s><?php endif; ?>
          <?php if (!empty($amz['savings_pct'])): ?><span class="badge inline">-<?= (int) $amz['savings_pct'] ?>%</span><?php endif; ?>
          <small class="when">Precio a <?= e(hora_precio($amz)) ?>. Los precios y la disponibilidad pueden cambiar; se aplicará el que figure en Amazon en el momento de la compra.</small>
        <?php else: ?>
          <span class="price muted">Consulta el precio actual en Amazon</span>
        <?php endif; ?>
      </div>
      <a class="btn btn-lg" href="<?= e($link) ?>" rel="sponsored nofollow noopener" target="_blank">Ver precio y comprar en Amazon</a>
      <p class="small">Enlace de afiliado: no pagas nada extra.</p>
      <?php if (!empty($amz['features'])): ?>
        <h2>Características destacadas</h2>
        <ul class="features"><?php foreach ($amz['features'] as $f): ?><li><?= e($f) ?></li><?php endforeach; ?></ul>
      <?php endif; ?>
      <div class="compare-actions row">
        <a class="btn btn-ghost" href="/comparar?u=<?= e($p['asin']) ?>"><?= icon('search', 18) ?> Comparar con alternativas</a>
      </div>
    </div>
  </div>

  <?php if ($rel): ?>
    <h2>También te puede interesar</h2>
    <div class="grid">
      <?php foreach ($rel as $r) echo tarjeta($r, $relAmz[$r['asin']] ?? null); ?>
    </div>
  <?php endif; ?>
</section>
