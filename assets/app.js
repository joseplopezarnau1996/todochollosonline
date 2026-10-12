(function () {
  var TC = window.TC || {};
  var TXT = Object.assign({ ver_amazon: 'Comprar en Amazon', mas_resultados: 'Ver más resultados en Amazon', comprar: 'Comprar en Amazon', compartir: 'Compartir' }, TC.txt || {});
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- Menú móvil ----------
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });

  function sinTildes(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  // ---------- Búsqueda en el catálogo (oculta las tiras mientras se busca) ----------
  var q = $('#q');
  if (q) q.addEventListener('input', function () {
    var t = sinTildes(q.value.toLowerCase().trim()), vis = 0, grid = $('#grid'), strips = $('#strips');
    if (strips) strips.hidden = !!t;
    if (grid) grid.hidden = !t;
    $$('#grid .card').forEach(function (card) { var ok = !!t && sinTildes(card.getAttribute('data-q')).indexOf(t) > -1; card.hidden = !ok; if (ok) vis++; });
    var e = $('#empty'); if (e) e.hidden = !t || vis > 0;
  });

  // ---------- Tiras de productos: flechas para desplazarse hacia los lados ----------
  $$('.strip-wrap').forEach(function (w) {
    var st = $('.strip', w), pv = $('.prev', w), nx = $('.next', w);
    function upd() { var max = st.scrollWidth - st.clientWidth - 4; pv.hidden = st.scrollLeft <= 4; nx.hidden = st.scrollLeft >= max; }
    pv.addEventListener('click', function () { st.scrollBy({ left: -st.clientWidth * 0.8 }); });
    nx.addEventListener('click', function () { st.scrollBy({ left: st.clientWidth * 0.8 }); });
    st.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });

  // ---------- «Los más buscados» en directo: lo que alguien compara aparece al momento ----------
  var live = $('[data-live="buscados"]');
  if (live && TC.api) {
    fetch(TC.api.replace(/\/$/, '') + '/buscados', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      var it = (d && d.items) || []; if (!it.length) return;
      var cart = ($('.card-actions .btn-buy svg') || {}).outerHTML || '', share = ($('.card-actions .share svg') || {}).outerHTML || '↗';
      var st = $('.strip', live);
      st.innerHTML = it.map(function (p, i) {
        var u = 'https://' + TC.mk + '/dp/' + encodeURIComponent(p.asin) + '?tag=' + TC.tag, ext = ' rel="sponsored nofollow noopener" target="_blank"';
        var f = new Date(p.u || Date.now()), when = f.toLocaleDateString('es-ES') + ' ' + f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return '<article class="card"><div class="card-top"><span class="num">' + (i + 1) + '</span>' + (p.nuevo ? '<span class="lbl lbl-green">RECIÉN BUSCADO</span>' : '') + '</div>' +
          '<a class="card-img" href="' + esc(u) + '"' + ext + '>' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="' + esc(p.titulo) + '" loading="lazy">' : '') + '</a>' +
          '<div class="card-body"><h3><a href="' + esc(u) + '"' + ext + '>' + esc(p.titulo) + '</a></h3><div class="price-box">' +
          (p.precio ? '<span class="price">' + esc(p.precio) + '</span><small class="when">Precio a ' + esc(when) + ' <span class="info" tabindex="0" title="Los precios y la disponibilidad pueden cambiar. Se aplica el precio que figure en Amazon en el momento de la compra.">ⓘ</span></small>'
            : '<span class="price muted">Consulta el precio en Amazon</span>') + '</div>' +
          '<div class="card-actions"><a class="btn btn-buy" href="' + esc(u) + '"' + ext + '>' + cart + ' ' + esc(TXT.comprar) + '</a>' +
          '<button type="button" class="btn btn-ghost share" data-url="' + esc(u) + '" data-title="' + esc(p.titulo) + '" aria-label="' + esc(TXT.compartir) + '" title="' + esc(TXT.compartir) + '">' + share + '</button></div></div></article>';
      }).join('');
      live.hidden = false; st.scrollLeft = 0; st.dispatchEvent(new Event('scroll'));
    }).catch(function () {});
  }

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

  // Búsquedas en la barra de Amazon (se cuentan como clic «Buscador Amazon» en las estadísticas)
  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest && ev.target.closest('form[data-amz-search]');
    if (!f || !TC.api || !navigator.sendBeacon) return;
    try { if (localStorage.getItem('tc_no_contar') === '1') return; } catch (e) {}
    var q = (f.querySelector('input[name=k]').value || '').trim();
    try { navigator.sendBeacon(TC.api.replace(/\/$/, '') + '/c', new Blob([JSON.stringify({ a: 'busqueda', t: 'Búsqueda: ' + q.slice(0, 70), p: location.pathname, s: 'Buscador Amazon' })], { type: 'text/plain' })); } catch (e) {}
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
      '<a class="btn btn-buy" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(TXT.ver_amazon) + '</a></div></div></div>';
  }

  function render(d) {
    var o = d.original, op = d.opciones || {};
    var when = new Date(d.actualizado || Date.now());
    var hora = when.toLocaleDateString('es-ES') + ' ' + when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var intro = d.modo === 'modelo' ? 'Hemos encontrado <b>el mismo modelo' + (d.modelo ? ' (' + esc(d.modelo) + ')' : '') + '</b> en otras ofertas de Amazon.'
      : d.modo === 'mixto' ? 'Hemos encontrado <b>el mismo modelo' + (d.modelo ? ' (' + esc(d.modelo) + ')' : '') + '</b> en algunas ofertas, y lo completamos con productos parecidos.'
      : 'No hemos encontrado otras ofertas del mismo modelo, así que te mostramos <b>productos parecidos</b>.';
    box.innerHTML =
      '<div class="res-orig">' + (o.image ? '<img src="' + esc(o.image) + '" alt="">' : '') +
      '<div><span class="ro-lab">Tu producto</span><h3>' + esc(o.title) + '</h3><span class="price">' + esc(o.price || 'Sin precio disponible') + '</span>' +
      ' <a href="' + esc(o.url) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(TXT.ver_amazon) + '</a></div></div>' +
      '<p class="res-intro">' + intro + '</p><div class="opts">' +
      prodCard(op.barato, 'green', 'Más barato', 'coin', '¡Buena elección! No hemos encontrado una opción comparable más barata.') +
      prodCard(op.valorado, 'blue', 'Mejor valorado', 'star', 'No hay alternativas mejor valoradas en este rango de precio.') +
      prodCard(op.popular, 'orange', 'Alternativa popular', 'fire', 'No hemos encontrado más alternativas.') +
      '</div><p class="res-foot">Buscado en Amazon.es · Precios a ' + esc(hora) +
      ' · Pueden cambiar; se aplica el que figure en Amazon al comprar. ' +
      (d.busqueda ? '<a href="' + esc(d.busqueda) + '" rel="sponsored nofollow noopener" target="_blank">' + esc(TXT.mas_resultados) + '</a>' : '') + '</p>';
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
