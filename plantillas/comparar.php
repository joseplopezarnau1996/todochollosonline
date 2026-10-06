<?php
// Catálogo con precios incrustado para el comparador (funciona sin servidor).
$catalogo = [];
foreach (productos() as $p) {
    $a = $amz[$p['asin']] ?? null;
    $catalogo[$p['asin']] = ['html' => tarjeta($p, $a), 'titulo' => $p['titulo'], 'cat' => $p['categoria']];
}
$tag = cfg()['partner_tag'];
$mk = cfg()['marketplace'];
?>
<section class="wrap section">
  <h1>Comparador</h1>
  <form class="compare compare-inline" action="/comparar" method="get">
    <label for="u" class="sr">Enlace del producto de Amazon o qué buscas</label>
    <input id="u" name="u" type="text" required placeholder="Enlace de Amazon, ASIN o lo que buscas (ej. mochila portátil)">
    <button class="btn" type="submit">Comparar</button>
  </form>
  <div id="res"></div>
</section>
<script>
(function () {
  var CAT = <?= json_encode($catalogo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?>;
  var TAG = <?= json_encode($tag) ?>, MK = <?= json_encode($mk) ?>;
  var q = new URLSearchParams(location.search).get('u') || '';
  var box = document.getElementById('res');
  document.getElementById('u').value = q;
  if (!q.trim()) { box.innerHTML = '<p class="lead">Pega el enlace de un producto de Amazon o escribe qué estás buscando.</p>'; return; }
  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function search(k, s) { return 'https://' + MK + '/s?k=' + encodeURIComponent(k) + '&tag=' + TAG + (s ? '&s=' + s : ''); }
  function buttons(k) {
    return '<div class="compare-actions"><h2>Busca alternativas en Amazon</h2>' +
      '<a class="btn btn-ghost" rel="sponsored nofollow noopener" target="_blank" href="' + search(k, 'price-asc-rank') + '">💶 Más baratos</a>' +
      '<a class="btn btn-ghost" rel="sponsored nofollow noopener" target="_blank" href="' + search(k, 'review-rank') + '">⭐ Mejor valorados</a>' +
      '<a class="btn btn-ghost" rel="sponsored nofollow noopener" target="_blank" href="' + search(k, 'exact-aware-popularity-rank') + '">🔥 Más vendidos</a></div>';
  }
  var m = q.trim().match(/^[A-Z0-9]{10}$/i) || q.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i);
  var asin = m ? (m[1] || m[0]).toUpperCase() : null;
  var html = '';
  if (asin && CAT[asin]) {
    var it = CAT[asin], kw = it.titulo.split(/[\s,|\-–:()]+/).slice(0, 5).join(' ');
    html = '<div class="compare-main">' + it.html + buttons(kw) + '</div>';
    var rel = Object.keys(CAT).filter(function (a) { return a !== asin && CAT[a].cat === it.cat; }).slice(0, 4);
    if (rel.length) html += '<h2>De nuestra selección</h2><div class="grid">' + rel.map(function (a) { return CAT[a].html; }).join('') + '</div>';
  } else if (asin) {
    html = '<div class="notice">Este producto no está en nuestra selección, pero puedes verlo en Amazon y comparar con alternativas.</div>' +
      '<p><a class="btn" rel="sponsored nofollow noopener" target="_blank" href="https://' + MK + '/dp/' + asin + '?tag=' + TAG + '">Ver el producto en Amazon</a></p>' +
      '<form class="compare compare-inline" action="/comparar" method="get"><input name="u" required placeholder="¿Qué producto es? (ej. auriculares bluetooth)"><button class="btn btn-ghost">Buscar alternativas</button></form>';
  } else if (/amzn\.|amazon\./i.test(q)) {
    html = '<div class="notice">No hemos reconocido el producto. Si es un enlace corto (amzn.eu), ábrelo primero en el navegador y copia la dirección completa, la que contiene <code>/dp/</code>.</div>';
  } else {
    html = '<p class="lead">Resultados para <b>' + esc(q) + '</b> en Amazon:</p>' + buttons(q);
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
    var hits = Object.keys(CAT).filter(function (a) { var t = CAT[a].titulo.toLowerCase(); return words.some(function (w) { return t.indexOf(w) > -1; }); }).slice(0, 8);
    if (hits.length) html += '<h2>De nuestra selección</h2><div class="grid">' + hits.map(function (a) { return CAT[a].html; }).join('') + '</div>';
  }
  box.innerHTML = html;
})();
</script>
