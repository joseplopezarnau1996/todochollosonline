(function () {
  var TC = window.TC || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- Menú móvil ----------
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });

  // ---------- Filtro y búsqueda del catálogo ----------
  var q = $('#q'), fcat = $('#fcat');
  function filtrar() {
    var t = (q && q.value || '').toLowerCase().trim(), c = fcat && fcat.value, vis = 0;
    $$('#grid .card').forEach(function (card) {
      var ok = (!c || card.getAttribute('data-cat') === c) && (!t || card.getAttribute('data-q').indexOf(t) > -1);
      card.hidden = !ok; if (ok) vis++;
    });
    var e = $('#empty'); if (e) e.hidden = vis > 0;
  }
  if (q) q.addEventListener('input', filtrar);
  if (fcat) fcat.addEventListener('change', filtrar);

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
    fire: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21c4 0 7-2.5 7-6.5 0-3-2-5.5-3.5-7-.3 2-1.5 3-2.5 3 .5-3-1-6.5-4-8 .3 3-1.5 5-3 7S5 12.5 5 14.5C5 18.5 8 21 12 21z"/></svg>'
  };
  var box = $('#resultado');

  function prodCard(p, cls, label, ico, note) {
    var head = '<div class="opt-head">' + ICON[ico] + ' ' + label + '</div>';
    if (!p) return '<div class="opt opt-' + cls + '">' + head + '<div class="opt-body opt-none">' + note + '</div></div>';
    return '<div class="opt opt-' + cls + '">' + head +
      '<div class="opt-body"><a class="opt-img" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank">' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '">' : '') + '</a>' +
      '<div class="opt-info"><h4>' + esc(p.title) + '</h4>' +
      '<div class="price-box"><span class="price">' + esc(p.price || '') + '</span>' +
      (p.oldPrice ? ' <s class="old">' + esc(p.oldPrice) + '</s>' : '') +
      (p.savings ? ' <span class="disc">-' + esc(p.savings) + '%</span>' : '') + '</div>' +
      '<a class="btn btn-buy" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank">Ver en Amazon</a></div></div></div>';
  }

  function render(d) {
    var o = d.original, op = d.opciones || {};
    var when = new Date(d.actualizado || Date.now());
    var hora = when.toLocaleDateString('es-ES') + ' ' + when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    box.innerHTML =
      '<div class="res-orig">' + (o.image ? '<img src="' + esc(o.image) + '" alt="">' : '') +
      '<div><small>Has comparado</small><h3>' + esc(o.title) + '</h3><span class="price">' + esc(o.price || 'Sin precio disponible') + '</span>' +
      ' <a href="' + esc(o.url) + '" rel="sponsored nofollow noopener" target="_blank">Ver en Amazon</a></div></div>' +
      '<div class="opts">' +
      prodCard(op.barato, 'green', 'Más barato', 'coin', '¡Buena elección! No hemos encontrado una alternativa comparable más barata.') +
      prodCard(op.valorado, 'blue', 'Mejor valorado', 'star', 'No hay alternativas con 4 estrellas o más en este rango de precio.') +
      prodCard(op.popular, 'orange', 'Alternativa popular', 'fire', 'No hemos encontrado más alternativas.') +
      '</div><p class="res-foot">Alternativas comparables buscadas en Amazon.es · Precios a ' + esc(hora) +
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
