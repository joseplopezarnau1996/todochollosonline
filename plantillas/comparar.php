<section class="hero hero-small">
  <div class="wrap">
    <span class="kicker">Comparador</span>
    <h1><?= e(aj('textos.hero_titulo')) ?> <em><?= e(aj('textos.hero_destacado')) ?></em></h1>
    <form class="compare" action="/comparar" method="get" data-compare>
      <label for="u" class="sr">Enlace del producto de Amazon</label>
      <span class="compare-ico"><?= icon('link', 22) ?></span>
      <input id="u" name="u" type="text" required autocomplete="off" placeholder="<?= e(aj('textos.buscador_placeholder', 'Pega aquí el enlace del producto de Amazon...')) ?>">
      <button class="btn btn-buy btn-lg" type="submit"><?= icon('search', 20) ?> <?= e(aj('textos.boton_comparar', 'Comparar')) ?></button>
    </form>
    <div id="resultado" class="result" hidden aria-live="polite"></div>
  </div>
</section>
