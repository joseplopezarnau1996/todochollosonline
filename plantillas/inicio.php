<section class="hero" id="comparador">
  <div class="wrap hero-in">
    <div>
      <span class="kicker">Tu comparador de precios</span>
      <h1>Compara antes<br>de comprar.</h1>
      <p class="lead">Pega el enlace de un producto de Amazon o escribe lo que buscas, y encuentra alternativas más baratas, mejor valoradas o más vendidas.</p>
      <form class="compare" action="/comparar" method="get">
        <label for="u" class="sr">Enlace del producto de Amazon</label>
        <input id="u" name="u" type="text" required placeholder="Enlace de Amazon o lo que buscas">
        <button class="btn btn-lg" type="submit">Comparar</button>
      </form>
      <p class="small">Comparar es gratis y el precio no aumenta por usar nuestros enlaces.</p>
    </div>
    <ul class="hero-points">
      <li><b>💶 Precios actualizados</b><span>Datos de Amazon refrescados cada hora.</span></li>
      <li><b>🔎 Alternativas</b><span>Productos parecidos para comparar.</span></li>
      <li><b>📘 Guías originales</b><span>Criterios claros para elegir bien.</span></li>
    </ul>
  </div>
</section>

<section class="wrap section">
  <div class="sec-head"><h2>Explora por categorías</h2><a href="/categorias">Ver todas →</a></div>
  <div class="chips">
    <?php foreach (categorias() as $c): ?>
      <a class="chip" href="/categoria/<?= e($c['slug']) ?>"><?= e($c['icono']) ?> <?= e($c['nombre']) ?></a>
    <?php endforeach; ?>
  </div>
</section>

<section class="wrap section" id="productos">
  <div class="sec-head"><h2>Chollos y productos destacados</h2></div>
  <div class="filters" role="tablist">
    <button class="filter on" data-f="">Todos</button>
    <?php $usadas = array_unique(array_column($prods, 'categoria')); foreach (categorias() as $c): if (!in_array($c['slug'], $usadas, true)) continue; ?>
      <button class="filter" data-f="<?= e($c['slug']) ?>"><?= e($c['nombre']) ?></button>
    <?php endforeach; ?>
  </div>
  <div class="grid">
    <?php foreach (array_reverse($prods) as $p) echo tarjeta($p, $amz[$p['asin']] ?? null); ?>
  </div>
</section>

<section class="wrap section">
  <div class="sec-head"><h2>Guías de compra</h2><a href="/guias/">Todas las guías →</a></div>
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

<section class="wrap section faq" id="nosotros">
  <h2>Todo claro antes de comprar</h2>
  <p>Todo Chollos Online es un proyecto editorial independiente. Organizamos productos por su utilidad y publicamos guías originales para ayudarte a comparar antes de comprar.</p>
  <details><summary>¿Vendéis vosotros los productos?</summary><p>No. La compra, el pago, el envío y las devoluciones se hacen directamente en Amazon.es.</p></details>
  <details><summary>¿Sube el precio si compro desde vuestro enlace?</summary><p>No. Pagas exactamente lo mismo. Amazon nos paga una pequeña comisión que nos ayuda a mantener la web.</p></details>
  <details><summary>¿De dónde salen los precios?</summary><p>Los consultamos automáticamente en Amazon y se actualizan cada hora. Junto a cada precio verás la fecha y hora de la consulta; el precio válido es el que aparezca en Amazon al comprar.</p></details>
  <details><summary>¿Cómo funciona el comparador?</summary><p>Pega el enlace de un producto de Amazon o escribe lo que buscas. Si está en nuestra selección verás su precio actualizado, y en cualquier caso puedes buscar al momento los más baratos, los mejor valorados o los más vendidos.</p></details>
</section>
