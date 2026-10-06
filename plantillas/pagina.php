<article class="wrap section article">
  <?php if (!empty($pg['actualizado'])): ?><p class="small">Última actualización: <?= e($pg['actualizado']) ?></p><?php endif; ?>
  <h1><?= e($pg['titulo']) ?></h1>
  <div class="prose"><?= $pg['html'] /* contenido editado en el panel */ ?></div>
</article>
