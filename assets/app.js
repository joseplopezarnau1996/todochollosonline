(function () {
  var TC = window.TC || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- Menú móvil ----------
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });

  // ---------- Búsqueda en el catálogo (oculta las tiras mientras se busca) ----------
  var q = $('#q');
  if (q) q.addEventListener('input', function () {
    var t = q.value.toLowerCase().trim(), vis = 0, grid = $('#grid'), strips = $('#strips');
    if (strips) strips.hidden = !!t;
    if (grid) grid.hidden = !t;
    $$('#grid .card').forEach(function (card) { var ok = !!t && card.getAttribute('data-q').indexOf(t) > -1; card.hidden = !ok; if (ok) vis++; });
    var e = $('#empty'); if (e) e.hidden = !t || vis > 0;
  });

  // ---------- Visitantes únicos (el servidor cuenta 1 por dispositivo y día) ----------
  try {
    if (TC.api && navigator.sendBeacon && !/^\/admin/.test(location.pathname) && localStorage.getItem('tc_no_contar') !== '1') {
      navigator.sendBeacon(TC.api.replace(/\/$/, '') + '/v', new Blob([JSON.stringify({ p: location.pathname, r: document.referrer })], { type: 'text/plain' }));
    }
  } catch (e) {}

  // ---------- Registro anónimo de clics hacia Amazon (para las estadísticas del panel) ----------
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href*="amazon."]');
    if (!a || !TC.api || !navigator.sendBeacon) return;
    try { if (localStorage.getItem('tc_no_contar') === '1') return; } catch (e) {}
    var m = a.href.match(/\/dp\/([A-Z0-9]{10})/i);
    var holder = a.closest('.card, .opt, .ex-col, .product, .res-orig');
    var tEl = holder && holder.querySelector('h1, h3, h4, img[alt]');
    var titulo = tEl ? (tEl.getAttribute('alt') || tEl.textContent) : document.title;
    var strip = a.closest('.strip-block'), sec = strip ? strip.querySelector('h3').textContent.trim()
      : a.closest('#resultado') ? 'Comparador' : a.closest('.example') ? 'Ejemplo portada' : a.closest('.product') ? 'Ficha de producto' : '';
    try {
      navigator.sendBeacon(TC.api.replace(/\/$/, '') + '/c', new Blob([JSON.stringify({
        a: m ? m[1].toUpperCase() : 'busqueda', t: (titulo || '').trim().slice(0, 90), p: location.pathname, s: sec
      })], { type: 'text/plain' }));
    } catch (e) {}
  }, true);

  // ---------- Compartir ----------
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.share');
    if (!b) return;
    var url = b.getAttribute('data-url'), title = b.getAttribute('data-title');
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () {
      var old = b.innerHTML; b.textContent = '¡Enlace copiado!'; setTimeout(function () { b.innerHTML = old; }, 1600);
    });
  });

  // ---------- Comparador ----------
  var ICON = {
    coin: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="14" r="6"/><path d="M15 4.3A6 6 0 0121 10a6 6 0 01-4 5.7M9 11v6M7 12.5h3a1.5 1.5 0 010 3H8"/></svg>',
    star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    fire: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21c4 0 7-2.5 7-6.5 0-3-2-5.5-3.5-7-.3 2-1.5 3-2.5 3 .5-3-1-6.5-4-8 .3 3-1.5 5-3 7S5 12.5 5 14.5C5 18.5 8 21 12 21z"/></svg>'
  };
  var box = $('#resultado');

  function prodCard(p, cls, label, ico, note, badge) {
    var head = '<div class="opt-head">' + ICON[ico] + ' ' + label + '</div>';
    if (!p) return '<div class="opt opt-' + cls + '">' + head + '<div class="opt-body opt-none">' + note + '</div></div>';
    var tipo = badge || (p.mismo ? '<span class="opt-tag same">✓ Mismo modelo</span>' : '<span class="opt-tag">Producto similar</span>');
    return '<div class="opt opt-' + cls + '">' + head +
      '<div class="opt-body"><a class="opt-img" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank">' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '">' : '') + '</a>' +
      '<div class="opt-info">' + tipo + '<h4>' + esc(p.title) + '</h4>' +
      '<div class="price-box"><span class="price">' + esc(p.price || 'Sin precio disponible') + '</span>' +
      (p.oldPrice ? ' <s class="old">' + esc(p.oldPrice) + '</s>' : '') +
      (p.savings ? ' <span class="disc">-' + esc(p.savings) + '%</span>' : '') + '</div>' +
      '<a class="btn btn-buy" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank">Ver en Amazon</a></div></div></div>';
  }

  function render(d) {
    var o = d.original, op = d.opciones || {};
    var when = new Date(d.actualizado || Date.now());
    var hora = when.toLocaleDateString('es-ES') + ' ' + when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var intro = d.modo === 'modelo' ? 'Hemos encontrado <b>el mismo modelo' + (d.modelo ? ' (' + esc(d.modelo) + ')' : '') + '</b> en otras ofertas de Amazon.'
      : d.modo === 'mixto' ? 'Hemos encontrado <b>el mismo modelo' + (d.modelo ? ' (' + esc(d.modelo) + ')' : '') + '</b> en algunas ofertas, y lo completamos con productos parecidos.'
      : 'No hemos encontrado otras ofertas del mismo modelo, así que te mostramos <b>productos parecidos</b>.';
    box.innerHTML = '<p class="res-intro">' + intro + '</p><div class="opts opts4">' +
      prodCard(o, 'yellow', 'Tu producto', 'search', '', '<span class="opt-tag">El que estás mirando</span>') +
      prodCard(op.barato, 'green', 'Más barato', 'coin', '¡Buena elección! No hemos encontrado una opción comparable más barata.') +
      prodCard(op.valorado, 'blue', 'Mejor valorado', 'star', 'No hay alternativas mejor valoradas en este rango de precio.') +
      prodCard(op.popular, 'orange', 'Alternativa popular', 'fire', 'No hemos encontrado más alternativas.') +
      '</div><p class="res-foot">Buscado en Amazon.es · Precios a ' + esc(hora) +
      ' · Pueden cambiar; se aplica el que figure en Amazon al comprar. ' +
      (d.busqueda ? '<a href="' + esc(d.busqueda) + '" rel="sponsored nofollow noopener" target="_blank">Ver más resultados en Amazon</a>' : '') + '</p>';
  }

  function sinServicio(input) {
    var m = input.match(/^[A-Z0-9]{10}$/i) || input.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i);
    var asin = m ? (m[1] || m[0]).toUpperCase() : null;
    box.innerHTML = '<div class="notice">El comparador automático no está disponible en este momento.' +
      (asin ? ' Puedes <a rel="sponsored nofollow noopener" target="_blank" href="https://' + TC.mk + '/dp/' + asin + '?tag=' + TC.tag + '">ver el producto en Amazon</a>.' : '') + '</div>';
  }

  function comparar(input) {
    if (!box) return;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!TC.api) { sinServicio(input); return; }
    box.innerHTML = '<div class="loading"><span class="spin"></span> Buscando las mejores alternativas en Amazon…</div>';
    fetch(TC.api + '?u=' + encodeURIComponent(input))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { box.innerHTML = '<div class="notice">' + esc(d.message) + '</div>'; return; }
        render(d);
      })
      .catch(function () { sinServicio(input); });
  }

  $$('form[data-compare]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = f.querySelector('input').value.trim();
      if (!v) return;
      if (history.replaceState && location.pathname === '/comparar') history.replaceState(null, '', '/comparar?u=' + encodeURIComponent(v));
      comparar(v);
    });
  });

  var u0 = new URLSearchParams(location.search).get('u');
  if (u0 && $('form[data-compare] input')) { $('form[data-compare] input').value = u0; comparar(u0); }
})();
