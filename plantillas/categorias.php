<section class="wrap section">
  <h1>Categorías</h1>
  <div class="cat-grid">
    <?php foreach (categorias() as $c): $n = count(productos($c['slug'])); ?>
      <a class="cat" href="/categoria/<?= e($c['slug']) ?>">
        <span class="cat-ico"><?= e($c['icono']) ?></span>
        <b><?= e($c['nombre']) ?></b>
        <small><?= $n ?> producto<?= $n === 1 ? '' : 's' ?></small>
      </a>
    <?php endforeach; ?>
  </div>
</section>
