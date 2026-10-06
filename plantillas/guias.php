<section class="wrap section">
  <h1>Guías de compra</h1>
  <p class="lead">Criterios claros y sin rodeos para elegir bien antes de comprar.</p>
  <div class="guides">
    <?php foreach ($guias as $g): ?>
      <a class="guide" href="/guias/<?= e($g['slug']) ?>">
        <span class="tag"><?= e(categorias()[$g['categoria']]['nombre'] ?? '') ?> · <?= e(fecha_es($g['fecha'])) ?></span>
        <h3><?= e($g['titulo']) ?></h3>
        <p><?= e($g['descripcion']) ?></p>
        <span class="more">Leer guía →</span>
      </a>
    <?php endforeach; ?>
  </div>
</section>
