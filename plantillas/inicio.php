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
      <span class="kicker">Tu comparador de precios</span>
      <h1>Compara antes<br>de <em>comprar.</em></h1>
      <p class="lead">Pega el enlace de un producto de Amazon y encuentra alternativas más baratas, mejor valoradas y populares en segundos.</p>
      <form class="compare" action="/comparar" method="get" data-compare>
        <label for="u" class="sr">Enlace del producto de Amazon</label>
        <span class="compare-ico"><?= icon('link', 22) ?></span>
        <input id="u" name="u" type="text" required autocomplete="off" placeholder="Pega aquí el enlace del producto de Amazon...">
        <button class="btn btn-buy btn-lg" type="submit"><?= icon('search', 20) ?> Comparar</button>
      </form>
    </div>
    <div class="hero-side">
      <p class="hand">Encuentra<br>el mejor precio<br>en segundos
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
      <div class="feat"><?= icon('coin', 30) ?><div><b>Más barato</b><span>Compara precios</span></div></div>
      <div class="feat"><?= icon('star', 30) ?><div><b>Mejor valorados</b><span>Opciones con buenas opiniones</span></div></div>
      <div class="feat"><?= icon('chart', 30) ?><div><b>Alternativas populares</b><span>Descubre otras opciones</span></div></div>
      <div class="feat"><?= icon('gift', 30) ?><div><b>100% Gratis</b><span>El precio no cambia</span></div></div>
    </div>
  </div>
</section>

<section class="wrap section">
  <div class="sec-head"><h2><span class="fire"><?= icon('fire', 30) ?></span> Explora por <em>categorías</em></h2><a href="/categorias">Ver todas las categorías <?= icon('arrow', 18) ?></a></div>
  <div class="cats">
    <?php $i = 0; foreach ($cats as $c): ?>
      <a class="cat-tile<?= $i++ === 0 ? ' on' : '' ?>" href="/categoria/<?= e($c['slug']) ?>"><?= icon($c['slug'], 34) ?><span><?= e($c['nombre']) ?></span></a>
    <?php endforeach; ?>
  </div>
</section>

<section class="wrap section" id="productos">
  <div class="sec-head">
    <h2><span class="fire"><?= icon('fire', 30) ?></span> Chollos y productos <em>destacados</em></h2>
    <div class="tools">
      <label class="search-box"><?= icon('search', 18) ?><input id="q" type="search" placeholder="Buscar en el catálogo..." aria-label="Buscar en el catálogo"></label>
      <select id="fcat" aria-label="Filtrar por categoría">
        <option value="">Todos</option>
        <?php $usadas = array_unique(array_column($prods, 'categoria')); foreach ($cats as $c): if (!in_array($c['slug'], $usadas, true)) continue; ?>
          <option value="<?= e($c['slug']) ?>"><?= e($c['nombre']) ?></option>
        <?php endforeach; ?>
      </select>
      <a class="more-link" href="/categorias">Ver catálogo <?= icon('arrow', 18) ?></a>
    </div>
  </div>
  <div class="grid" id="grid">
    <?php $n = 1; foreach (array_reverse($prods) as $p) echo tarjeta($p, $amz[$p['asin']] ?? null, $n++); ?>
  </div>
  <p class="empty" id="empty" hidden>No hay productos que coincidan. Prueba con el comparador de arriba.</p>
</section>

<section class="wrap section">
  <div class="sec-head"><h2>Guías de <em>compra</em></h2><a href="/guias/">Todas las guías <?= icon('arrow', 18) ?></a></div>
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
  <h2>Sobre <em>nosotros</em></h2>
  <p class="lead">Todo Chollos Online es un proyecto independiente. Organizamos productos por su utilidad, publicamos guías originales y te ayudamos a comparar antes de comprar.</p>
  <details><summary>¿Vendéis vosotros los productos?</summary><p>No. La compra, el pago, el envío y las devoluciones se hacen directamente en Amazon.es.</p></details>
  <details><summary>¿Sube el precio si compro desde vuestro enlace?</summary><p>No. Pagas exactamente lo mismo. Amazon nos paga una pequeña comisión que nos ayuda a mantener la web.</p></details>
  <details><summary>¿De dónde salen los precios?</summary><p>Los consultamos automáticamente en Amazon. Junto a cada precio verás la fecha y hora de la consulta; el precio válido es el que aparezca en Amazon al comprar.</p></details>
  <details><summary>¿Cómo funciona el comparador?</summary><p>Pega el enlace de cualquier producto de Amazon. Buscamos productos parecidos en Amazon y te mostramos la alternativa más barata, una con muy buenas valoraciones (4 estrellas o más) y la alternativa más popular.</p></details>
</section>
