<section class="wrap section">
  <h1>Categorías</h1>
  <div class="cat-grid">
    <?php foreach (categorias() as $c): $n = count(productos($c['slug'])); ?>
      <a class="cat" href="/categoria/<?= e($c['slug']) ?>">
        <?= icon($c['slug'], 34) ?>
        <b><?= e($c['nombre']) ?></b>
        <small><?= $n ?> producto<?= $n === 1 ? '' : 's' ?></small>
      </a>
    <?php endforeach; ?>
  </div>
</section>
