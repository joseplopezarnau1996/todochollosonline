<?php
$cats = categorias();
$opt = function (?array $x, string $label, string $ico, string $cls) {
    if (!$x) return '';
    $link = amazon_link($x['asin']);
    return '<div class="ex-col ex-' . $cls . '"><div class="ex-head">' . icon($ico, 15) . ' ' . e($label) . '</div>'
        . '<a class="ex-img" href="' . e($link) . '" rel="sponsored nofollow noopener" target="_blank">'
        . ($x['image'] ? '<img src="' . e($x['image']) . '" alt="' . e($x['title']) . '" loading="lazy">' : icon('box', 40)) . '</a>'
        . '<div class="ex-price">' . e($x['price']) . (!empty($x['savings_pct']) ? ' <span class="disc">-' . (int) $x['savings_pct'] . '%</span>' : '') . '</div>'
        . '<a class="btn btn-buy btn-sm" href="' . e($link) . '" rel="sponsored nofollow noopener" target="_blank">Ver en Amazon</a></div>';
};
?>
<section class="hero" id="comparador">
  <div class="wrap hero-in">
    <div class="hero-txt">
      <span class="kicker"><?= e(aj('textos.hero_kicker')) ?></span>
      <h1><?= e(aj('textos.hero_titulo')) ?> <em><?= e(aj('textos.hero_destacado')) ?></em></h1>
      <p class="lead"><?= e(aj('textos.hero_texto')) ?></p>
      <form class="compare" action="/comparar" method="get" data-compare>
        <label for="u" class="sr">Enlace del producto de Amazon</label>
        <span class="compare-ico"><?= icon('link', 22) ?></span>
        <input id="u" name="u" type="text" required autocomplete="off" placeholder="<?= e(aj('textos.buscador_placeholder', 'Pega aquí el enlace del producto de Amazon...')) ?>">
        <button class="btn btn-buy btn-lg" type="submit"><?= icon('search', 20) ?> <?= e(aj('textos.boton_comparar', 'Comparar')) ?></button>
      </form>
    </div>
    <div class="hero-side">
      <p class="hand"><?= nl2br(e(wordwrap(aj('textos.mano'), 16, "\n"))) ?>
        <svg class="hand-arrow" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M10 10c30 5 70 20 90 55"/><path d="M84 58l16 8 2-18"/></svg>
      </p>
      <?php if (!empty($ejemplo)): ?>
        <div class="example">
          <div class="example-head">Ejemplo de comparativa <small>con <?= e(mb_strimwidth($ejemplo['original']['title'], 0, 38, '…')) ?></small></div>
          <div class="example-cols">
            <?= $opt($ejemplo['barato'], 'Más barato', 'coin', 'green') ?>
            <?= $opt($ejemplo['valorado'], 'Mejor valorado', 'star', 'blue') ?>
            <?= $opt($ejemplo['popular'], 'Alternativa popular', 'fire', 'orange') ?>
          </div>
          <small class="example-foot">Datos reales de Amazon a <?= e(date('d/m/Y H:i')) ?></small>
        </div>
      <?php endif; ?>
    </div>
  </div>
  <div class="wrap">
    <div id="resultado" class="result" hidden aria-live="polite"></div>
    <div class="feats">
      <?php $fi = ['coin', 'star', 'chart', 'gift']; foreach (array_slice((array) aj('textos.feats', []), 0, 4) as $k => $f): ?>
      <div class="feat"><?= icon($fi[$k], 30) ?><div><b><?= e($f['titulo'] ?? '') ?></b><span><?= e($f['texto'] ?? '') ?></span></div></div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<section class="wrap section">
  <div class="sec-head"><h2><span class="fire"><?= icon('fire', 30) ?></span> <?= e(aj('textos.cat_titulo')) ?> <em><?= e(aj('textos.cat_destacado')) ?></em></h2><a href="/categorias">Ver todas las categorías <?= icon('arrow', 18) ?></a></div>
  <div class="cats">
    <?php $i = 0; foreach ($cats as $c): ?>
      <a class="cat-tile<?= $i++ === 0 ? ' on' : '' ?>" href="/categoria/<?= e($c['slug']) ?>"><?= icon($c['icono'] ?? $c['slug'], 34) ?><span><?= e($c['nombre']) ?></span></a>
    <?php endforeach; ?>
  </div>
</section>

<section class="wrap section" id="productos">
  <div class="sec-head">
    <h2><span class="fire"><?= icon('fire', 30) ?></span> <?= e(aj('textos.prod_titulo')) ?> <em><?= e(aj('textos.prod_destacado')) ?></em></h2>
    <div class="tools">
      <label class="search-box"><?= icon('search', 18) ?><input id="q" type="search" placeholder="Buscar en el catálogo..." aria-label="Buscar en el catálogo"></label>
      <a class="more-link" href="/categorias">Ver catálogo <?= icon('arrow', 18) ?></a>
    </div>
  </div>
  <div id="strips">
    <?php $ico = ['ofertas' => 'coin', 'novedades' => 'star', 'manual' => 'fire', 'categoria' => 'etiqueta']; foreach (secciones_portada($prods, $amz) as $sec): ?>
      <div class="strip-block">
        <div class="strip-head">
          <h3><span class="strip-ico"><?= icon($sec['tipo'] === 'categoria' ? ((categorias()[substr($sec['link'], 11)]['icono'] ?? 'etiqueta')) : $ico[$sec['tipo']], 22) ?></span> <?= e($sec['titulo']) ?></h3>
          <?php if ($sec['link']): ?><a class="more-link" href="<?= e($sec['link']) ?>">Ver todos <?= icon('arrow', 16) ?></a><?php endif; ?>
        </div>
        <div class="strip-wrap">
          <button class="strip-nav prev" type="button" aria-label="Anteriores" hidden>&#8249;</button>
          <div class="strip">
            <?php $n = 1; foreach ($sec['productos'] as $p) echo tarjeta($p, $amz[$p['asin']] ?? null, $n++); ?>
          </div>
          <button class="strip-nav next" type="button" aria-label="Siguientes" hidden>&#8250;</button>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
  <div class="grid" id="grid" hidden>
    <?php foreach (array_reverse($prods) as $p) echo tarjeta($p, $amz[$p['asin']] ?? null); ?>
  </div>
  <p class="empty" id="empty" hidden>No hay productos que coincidan. Prueba con el comparador de arriba.</p>
</section>

<section class="wrap section">
  <div class="sec-head"><h2><?= e(aj('textos.guias_titulo')) ?> <em><?= e(aj('textos.guias_destacado')) ?></em></h2><a href="/guias/">Todas las guías <?= icon('arrow', 18) ?></a></div>
  <div class="guides">
    <?php foreach ($guias as $g): ?>
      <a class="guide" href="/guias/<?= e($g['slug']) ?>">
        <span class="tag"><?= e($cats[$g['categoria']]['nombre'] ?? '') ?> · <?= e(fecha_es($g['fecha'])) ?></span>
        <h3><?= e($g['titulo']) ?></h3>
        <p><?= e($g['descripcion']) ?></p>
        <span class="more">Leer guía <?= icon('arrow', 16) ?></span>
      </a>
    <?php endforeach; ?>
  </div>
</section>

<section class="wrap section faq" id="nosotros">
  <h2><?= e(aj('textos.nosotros_titulo')) ?> <em><?= e(aj('textos.nosotros_destacado')) ?></em></h2>
  <p class="lead"><?= e(aj('textos.nosotros_texto')) ?></p>
  <?php foreach ((array) aj('textos.faq', []) as $q): ?><details><summary><?= e($q['p'] ?? '') ?></summary><p><?= e($q['r'] ?? '') ?></p></details><?php endforeach; ?>
</section>
