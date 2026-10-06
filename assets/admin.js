/* Panel de administración de Todo Chollos Online */
(function () {
  'use strict';
  var API = (window.API || '').replace(/\/$/, '');
  var app = document.getElementById('app');
  var S = { token: null, user: null, role: null, data: null, view: 'productos', icons: {}, found: null, editing: null };
  try { S.token = sessionStorage.getItem('tc_token'); } catch (e) {}

  // ---------- utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function $(s) { return app.querySelector(s); }
  function val(s) { var el = $(s); return el ? el.value.trim() : ''; }
  function toast(msg, bad) {
    var t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, bad ? 6000 : 4000);
  }
  function api(method, path, body) {
    var h = { 'Content-Type': 'application/json' };
    if (S.token) h.Authorization = 'Bearer ' + S.token;
    return fetch(API + '/api/' + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return { error: true, message: 'Respuesta no válida del servidor.' }; }).then(function (j) {
        if (r.status === 401 && S.token && path !== 'login') { logout(); }
        if (j.error) throw new Error(j.message || 'Error');
        return j;
      }); });
  }
  function busy(btn, on) { if (btn) { btn.disabled = on; if (on) { btn.dataset.txt = btn.innerHTML; btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span>'; } else if (btn.dataset.txt) btn.innerHTML = btn.dataset.txt; } }
  function saveFile(ruta, datos, btn) {
    busy(btn, true);
    return api('PUT', 'archivo', { ruta: ruta, datos: datos })
      .then(function () { toast('✅ Guardado. La web se actualizará en 1-2 minutos.'); })
      .catch(function (e) { toast('❌ ' + e.message, true); throw e; })
      .finally(function () { busy(btn, false); });
  }
  function icon(name) { return S.icons[name] || S.icons.etiqueta || ''; }

  // ---------- arranque ----------
  if (!API) { app.innerHTML = '<div class="center-box"><div class="login"><h2>Panel no configurado</h2><p class="muted">Falta la dirección del servidor (compare_api).</p></div></div>'; return; }
  fetch('/assets/iconos.json').then(function (r) { return r.json(); }).then(function (j) { S.icons = j; }).catch(function () {});
  if (S.token) api('GET', 'yo').then(function (j) { S.user = j.usuario; S.role = j.rol; loadAll(); }).catch(function () { start(); });
  else start();

  function start() {
    api('GET', 'estado').then(function (j) { j.hayUsuarios ? loginView() : setupView(); })
      .catch(function (e) { app.innerHTML = '<div class="center-box"><div class="login"><h2>No se puede conectar</h2><p class="err">' + esc(e.message) + '</p></div></div>'; });
  }

  function brand() { return '<div class="logo"><i></i><span>Todo<em>Chollos</em> · Panel</span></div>'; }

  function loginView() {
    app.innerHTML = '<div class="center-box"><form class="login" id="f">' + brand() +
      '<label>Usuario<input id="u" autocomplete="username" required></label>' +
      '<label>Contraseña<input id="p" type="password" autocomplete="current-password" required></label>' +
      '<p class="err" id="e"></p><button class="btn full">Entrar</button>' +
      '<p class="small muted" style="margin-top:14px"><a href="/">← Volver a la web</a></p></form></div>';
    $('#f').onsubmit = function (ev) {
      ev.preventDefault(); var b = ev.target.querySelector('button'); busy(b, true);
      api('POST', 'login', { usuario: val('#u'), clave: $('#p').value }).then(loggedIn).catch(function (e) { $('#e').textContent = e.message; }).finally(function () { busy(b, false); });
    };
  }
  function setupView() {
    app.innerHTML = '<div class="center-box"><form class="login" id="f">' + brand() +
      '<h2>Crea tu usuario administrador</h2><p class="muted small">Es la primera vez que se abre el panel. El usuario que crees ahora podrá crear el resto.</p>' +
      '<label>Usuario<input id="u" autocomplete="username" required></label>' +
      '<label>Contraseña <small>(mínimo 8 caracteres)</small><input id="p" type="password" autocomplete="new-password" required minlength="8"></label>' +
      '<label>Repite la contraseña<input id="p2" type="password" autocomplete="new-password" required></label>' +
      '<p class="err" id="e"></p><button class="btn full">Crear y entrar</button></form></div>';
    $('#f').onsubmit = function (ev) {
      ev.preventDefault();
      if ($('#p').value !== $('#p2').value) { $('#e').textContent = 'Las contraseñas no coinciden.'; return; }
      var b = ev.target.querySelector('button'); busy(b, true);
      api('POST', 'setup', { usuario: val('#u'), clave: $('#p').value }).then(loggedIn).catch(function (e) { $('#e').textContent = e.message; }).finally(function () { busy(b, false); });
    };
  }
  function loggedIn(j) {
    S.token = j.token; S.user = j.usuario; S.role = j.rol;
    try { sessionStorage.setItem('tc_token', j.token); } catch (e) {}
    loadAll();
  }
  function logout() { S.token = null; try { sessionStorage.removeItem('tc_token'); } catch (e) {} loginView(); }

  function loadAll() {
    app.innerHTML = '<div class="center-box"><span class="spin"></span></div>';
    api('GET', 'contenido').then(function (d) {
      d.ajustes = d.ajustes || {}; d.ajustes.textos = d.ajustes.textos || {}; d.ajustes.colores = d.ajustes.colores || {};
      S.data = d; shell();
    }).catch(function (e) { app.innerHTML = '<div class="center-box"><div class="login"><h2>Error al cargar</h2><p class="err">' + esc(e.message) + '</p><button class="btn" onclick="location.reload()">Reintentar</button></div></div>'; });
  }

  // ---------- estructura ----------
  var VIEWS = [['productos', '📦 Productos'], ['portada', '🏠 Portada'], ['categorias', '🏷️ Categorías'], ['textos', '✏️ Textos y diseño'], ['guias', '📘 Guías'], ['paginas', '📄 Páginas legales'], ['usuarios', '👥 Usuarios'], ['cuenta', '🔑 Mi cuenta']];
  function shell() {
    app.innerHTML = '<div class="layout"><aside class="side" id="side">' + brand() +
      VIEWS.filter(function (v) { return v[0] !== 'usuarios' || S.role === 'admin'; }).map(function (v) { return '<button data-view="' + v[0] + '">' + v[1] + '</button>'; }).join('') +
      '<a class="btn btn-ghost btn-sm" href="/" target="_blank" style="margin-top:12px">Ver la web ↗</a>' +
      '<div class="who">Conectado como <b>' + esc(S.user) + '</b> (' + (S.role === 'admin' ? 'administrador' : 'editor') + ')<br><a href="#" id="logout">Cerrar sesión</a></div></aside>' +
      '<main class="main" id="main"></main></div>';
    app.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { S.view = b.dataset.view; S.editing = null; S.secs = null; $('#side').classList.remove('open'); render(); }; });
    $('#logout').onclick = function (e) { e.preventDefault(); logout(); };
    render();
  }
  function render() {
    app.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('on', b.dataset.view === S.view); });
    var m = $('#main');
    var menu = '<button class="btn btn-ghost btn-sm menu-btn" onclick="document.getElementById(\'side\').classList.toggle(\'open\')">☰ Menú</button>';
    m.onclick = null; m.onchange = null;
    m.innerHTML = menu + ({ productos: vProductos, portada: vPortada, categorias: vCategorias, textos: vTextos, guias: vGuias, paginas: vPaginas, usuarios: vUsuarios, cuenta: vCuenta }[S.view])();
    bind[S.view] && bind[S.view](m);
    window.scrollTo(0, 0);
  }
  var bind = {};
  function catOptions(sel) { return S.data.categorias.map(function (c) { return '<option value="' + esc(c.slug) + '"' + (c.slug === sel ? ' selected' : '') + '>' + esc(c.nombre) + '</option>'; }).join(''); }
  function catName(slug) { var c = S.data.categorias.find(function (x) { return x.slug === slug; }); return c ? c.nombre : slug; }

  // ---------- PRODUCTOS ----------
  function vProductos() {
    var P = S.data.productos;
    var f = S.found;
    var add = '<div class="card"><h2>➕ Añadir producto</h2><p class="muted small">Pega el enlace de Amazon y pulsa Buscar: la imagen, el título, el precio y la descripción se rellenan solos.</p>' +
      '<form class="row" id="fFind"><input class="grow" id="url" placeholder="https://www.amazon.es/dp/..." value="' + esc(f ? f._url : '') + '" required><button class="btn">Buscar</button></form>' +
      (f ? '<div class="preview"><div class="img">' + (f.imagen ? '<img src="' + esc(f.imagen) + '" alt="">' : '') + '</div><div>' +
        '<p><span class="price">' + esc(f.precio || 'Sin precio') + '</span> ' + (f.precioAnterior ? '<s class="muted">' + esc(f.precioAnterior) + '</s> ' : '') + (f.descuento ? '<span class="badge">-' + esc(f.descuento) + '%</span>' : '') +
        ' <span class="tag">ASIN ' + esc(f.asin) + '</span></p>' +
        '<label>Título<input id="nTit" maxlength="160" value="' + esc(f.titulo) + '"></label>' +
        '<label>Descripción <small>(puedes retocarla)</small><textarea id="nDesc" maxlength="400">' + esc(f._desc) + '</textarea></label>' +
        '<div class="grid2"><label>Categoría<select id="nCat"><option value="">Elige…</option>' + catOptions('') + '</select></label>' +
        '<label>Destacado en portada<select id="nDest"><option value="1">Sí</option><option value="0">No</option></select></label></div>' +
        '<div class="row"><button class="btn" id="bAdd">Añadir a la web</button><button class="btn btn-ghost" id="bCancel">Cancelar</button></div>' +
        '<p class="small muted">El precio no se guarda: la web lo consulta en Amazon cada hora.</p></div></div>' : '') + '</div>';
    var list = '<div class="card"><div class="head"><h2 style="margin:0">Productos en la web (' + P.length + ')</h2><input id="q" placeholder="Buscar…" style="max-width:240px"></div><div class="list">' +
      P.map(function (p, i) { return { p: p, i: i }; }).reverse().map(function (o) {
        var p = o.p, i = o.i;
        if (S.editing === 'p' + i) {
          return '<div class="item" style="display:block"><div class="grid2"><label>Título<input id="eTit" value="' + esc(p.titulo) + '"></label><label>Categoría<select id="eCat">' + catOptions(p.categoria) + '</select></label></div>' +
            '<label>Descripción<textarea id="eDesc">' + esc(p.descripcion) + '</textarea></label>' +
            '<div class="grid2"><label>Imagen (URL) <small>se actualiza sola desde Amazon</small><input id="eImg" value="' + esc(p.imagen || '') + '"></label>' +
            '<label>Destacado<select id="eDest"><option value="1"' + (p.destacado !== false ? ' selected' : '') + '>Sí</option><option value="0"' + (p.destacado === false ? ' selected' : '') + '>No</option></select></label></div>' +
            '<div class="row"><button class="btn btn-sm" data-act="pSave" data-i="' + i + '">Guardar</button><button class="btn btn-ghost btn-sm" data-act="pCancel">Cancelar</button></div></div>';
        }
        return '<div class="item" data-q="' + esc((p.titulo + ' ' + p.asin + ' ' + catName(p.categoria)).toLowerCase()) + '">' +
          (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="" loading="lazy">' : '<span class="ph"></span>') +
          '<div class="t"><b>' + esc(p.titulo) + '</b><small>' + esc(catName(p.categoria)) + ' · ' + esc(p.asin) + (p.destacado === false ? ' · oculto en portada' : '') + '</small></div>' +
          '<div class="acts"><button class="btn btn-ghost btn-sm" data-act="pUp" data-i="' + i + '" title="Subir">↑</button><button class="btn btn-ghost btn-sm" data-act="pDown" data-i="' + i + '" title="Bajar">↓</button>' +
          '<a class="btn btn-ghost btn-sm" href="/producto/' + esc(p.asin) + '" target="_blank">Ver</a>' +
          '<button class="btn btn-ghost btn-sm" data-act="pEdit" data-i="' + i + '">Editar</button><button class="btn btn-danger btn-sm" data-act="pDel" data-i="' + i + '">Quitar</button></div></div>';
      }).join('') + '</div></div>';
    return '<div class="head"><h1>Productos</h1></div>' + add + list;
  }
  bind.productos = function (m) {
    var P = S.data.productos;
    $('#fFind').onsubmit = function (ev) {
      ev.preventDefault(); var b = ev.target.querySelector('button'); var u = val('#url'); busy(b, true);
      api('GET', 'producto?u=' + encodeURIComponent(u)).then(function (j) {
        if (P.some(function (p) { return p.asin === j.asin; })) toast('⚠️ Este producto ya está en la web.', true);
        j._url = u; j._desc = (j.caracteristicas || []).slice(0, 2).join(' ').slice(0, 380);
        S.found = j; render();
      }).catch(function (e) { toast('❌ ' + e.message, true); }).finally(function () { busy(b, false); });
    };
    if ($('#bCancel')) $('#bCancel').onclick = function () { S.found = null; render(); };
    if ($('#bAdd')) $('#bAdd').onclick = function () {
      var f = S.found, cat = val('#nCat');
      if (!cat) { toast('Elige una categoría.', true); return; }
      if (P.some(function (p) { return p.asin === f.asin; })) { toast('Este producto ya está en la web.', true); return; }
      var nuevo = { asin: f.asin, categoria: cat, titulo: val('#nTit') || f.titulo, descripcion: val('#nDesc'), imagen: f.imagen || '', destacado: val('#nDest') === '1', alta: today() };
      var next = P.concat([nuevo]);
      saveFile('data/productos.json', next, this).then(function () { S.data.productos = next; S.found = null; render(); });
    };
    var q = $('#q'); if (q) q.oninput = function () { var t = q.value.toLowerCase(); m.querySelectorAll('.item[data-q]').forEach(function (it) { it.hidden = t && it.dataset.q.indexOf(t) < 0; }); };
    m.onclick = function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var i = +b.dataset.i, act = b.dataset.act, next;
      if (act === 'pEdit') { S.editing = 'p' + i; render(); }
      if (act === 'pCancel') { S.editing = null; render(); }
      if (act === 'pSave') {
        next = P.slice(); next[i] = Object.assign({}, next[i], { titulo: val('#eTit'), categoria: val('#eCat'), descripcion: val('#eDesc'), imagen: val('#eImg'), destacado: val('#eDest') === '1' });
        saveFile('data/productos.json', next, b).then(function () { S.data.productos = next; S.editing = null; render(); });
      }
      if (act === 'pDel') {
        if (!confirm('¿Quitar «' + P[i].titulo + '» de la web?')) return;
        next = P.slice(); next.splice(i, 1);
        saveFile('data/productos.json', next, b).then(function () { S.data.productos = next; render(); });
      }
      if (act === 'pUp' || act === 'pDown') {
        // La portada muestra primero los últimos de la lista: "subir" = mover hacia el final.
        var j = act === 'pUp' ? i + 1 : i - 1; if (j < 0 || j >= P.length) return;
        next = P.slice(); var t = next[i]; next[i] = next[j]; next[j] = t;
        saveFile('data/productos.json', next, b).then(function () { S.data.productos = next; render(); });
      }
    };
  };

  // ---------- PORTADA (tiras de productos) ----------
  function seccionesPorDefecto() {
    var out = [{ titulo: 'Ofertas', tipo: 'ofertas', cantidad: 5 }, { titulo: 'Novedades', tipo: 'novedades', cantidad: 5 }];
    S.data.categorias.forEach(function (c) { out.push({ titulo: c.nombre, tipo: 'categoria', categoria: c.slug, cantidad: 5 }); });
    return out;
  }
  var TIPOS = { ofertas: 'Ofertas (productos con descuento ahora mismo)', novedades: 'Novedades (los últimos que has añadido)', categoria: 'Una categoría', manual: 'Productos elegidos a mano' };
  function vPortada() {
    if (!S.secs) S.secs = JSON.parse(JSON.stringify((S.data.ajustes.secciones && S.data.ajustes.secciones.length) ? S.data.ajustes.secciones : seccionesPorDefecto()));
    var P = S.data.productos;
    return '<div class="head"><h1>Portada</h1><div class="row"><button class="btn btn-ghost" id="sAuto">Generar automáticamente</button><button class="btn" id="sSave">Guardar portada</button></div></div>' +
      '<p class="muted">Cada bloque es una tira de productos en la portada, en este orden. Las tiras vacías (por ejemplo, «Ofertas» si ahora no hay descuentos) no se muestran.</p>' +
      S.secs.map(function (sec, i) {
        var tipo = sec.tipo || 'categoria';
        return '<div class="card" data-sec="' + i + '"><div class="row" style="margin-bottom:10px"><b class="grow">' + (i + 1) + '. ' + esc(sec.titulo || '(sin título)') + (sec.oculta ? ' <span class="tag">oculta</span>' : '') + '</b>' +
          '<button class="btn btn-ghost btn-sm" data-act="sUp">↑</button><button class="btn btn-ghost btn-sm" data-act="sDown">↓</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="sHide">' + (sec.oculta ? 'Mostrar' : 'Ocultar') + '</button><button class="btn btn-danger btn-sm" data-act="sDel">Quitar</button></div>' +
          '<div class="grid3"><label>Título de la tira<input data-f="titulo" value="' + esc(sec.titulo || '') + '"></label>' +
          '<label>Qué productos muestra<select data-f="tipo">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (k === tipo ? ' selected' : '') + '>' + TIPOS[k] + '</option>'; }).join('') + '</select></label>' +
          '<label>Cuántos productos<input data-f="cantidad" type="number" min="1" max="20" value="' + esc(sec.cantidad || 5) + '"></label></div>' +
          (tipo === 'categoria' ? '<label>Categoría<select data-f="categoria">' + catOptions(sec.categoria) + '</select></label>' : '') +
          (tipo === 'manual' ? '<label>Elige los productos <small>(en el orden en que los marques)</small></label><div class="list" style="max-height:260px;overflow:auto">' +
            P.slice().reverse().map(function (p) { var on = (sec.asins || []).indexOf(p.asin) >= 0;
              return '<label class="item" style="flex-direction:row;margin:0;cursor:pointer"><input type="checkbox" data-asin="' + esc(p.asin) + '"' + (on ? ' checked' : '') + '>' +
                (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="">' : '<span class="ph"></span>') + '<span class="t"><b>' + esc(p.titulo) + '</b><small>' + esc(catName(p.categoria)) + '</small></span></label>'; }).join('') + '</div>' : '') +
          '</div>';
      }).join('') +
      '<button class="btn btn-ghost" id="sAdd">+ Añadir tira</button> <button class="btn" id="sSave2">Guardar portada</button>';
  }
  bind.portada = function (m) {
    function sync() {
      m.querySelectorAll('[data-sec]').forEach(function (card) {
        var sec = S.secs[+card.dataset.sec];
        card.querySelectorAll('[data-f]').forEach(function (el) { sec[el.dataset.f] = el.dataset.f === 'cantidad' ? Math.max(1, Math.min(20, parseInt(el.value, 10) || 5)) : el.value.trim(); });
        if (sec.tipo !== 'categoria') delete sec.categoria;
        if (sec.tipo === 'manual') {
          var prev = sec.asins || [], now = [].map.call(card.querySelectorAll('[data-asin]:checked'), function (c) { return c.dataset.asin; });
          sec.asins = prev.filter(function (a) { return now.indexOf(a) >= 0; }).concat(now.filter(function (a) { return prev.indexOf(a) < 0; }));
        } else delete sec.asins;
      });
    }
    m.onchange = function (ev) { if (ev.target.dataset.f === 'tipo') { sync(); var sec = S.secs[+ev.target.closest('[data-sec]').dataset.sec]; if (sec.tipo === 'categoria' && !sec.categoria) sec.categoria = (S.data.categorias[0] || {}).slug; render(); } };
    m.onclick = function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; sync();
      var i = +b.closest('[data-sec]').dataset.sec, a = b.dataset.act, L = S.secs;
      if (a === 'sDel') { if (!confirm('¿Quitar la tira «' + (L[i].titulo || '') + '»?')) return; L.splice(i, 1); }
      if (a === 'sHide') L[i].oculta = !L[i].oculta;
      if (a === 'sUp' && i > 0) { var t = L[i]; L[i] = L[i - 1]; L[i - 1] = t; }
      if (a === 'sDown' && i < L.length - 1) { var t2 = L[i]; L[i] = L[i + 1]; L[i + 1] = t2; }
      render();
    };
    $('#sAdd').onclick = function () { sync(); S.secs.push({ titulo: 'Nueva tira', tipo: 'categoria', categoria: (S.data.categorias[0] || {}).slug, cantidad: 5 }); render(); window.scrollTo(0, document.body.scrollHeight); };
    $('#sAuto').onclick = function () { if (!confirm('¿Sustituir las tiras actuales por: Ofertas, Novedades y una tira por cada categoría?')) return; S.secs = seccionesPorDefecto(); render(); };
    function save() {
      sync();
      var A = JSON.parse(JSON.stringify(S.data.ajustes)); A.secciones = S.secs;
      saveFile('data/ajustes.json', A, this).then(function () { S.data.ajustes = A; });
    }
    $('#sSave').onclick = save; $('#sSave2').onclick = save;
  };

  // ---------- CATEGORÍAS ----------
  function iconPicker(id, sel) {
    return '<div class="icons" id="' + id + '">' + Object.keys(S.icons).filter(function (k) { return ['search', 'link', 'cart', 'share', 'arrow', 'menu', 'clock', 'check'].indexOf(k) < 0; })
      .map(function (k) { return '<button type="button" data-ico="' + k + '" class="' + (k === sel ? 'on' : '') + '" title="' + k + '">' + S.icons[k] + '</button>'; }).join('') + '</div>';
  }
  function vCategorias() {
    var C = S.data.categorias;
    return '<div class="head"><h1>Categorías</h1></div>' +
      '<div class="card"><h2>➕ Nueva categoría</h2><div class="grid2"><label>Nombre<input id="cNom" maxlength="40"></label><label>Dirección <small>(se genera sola)</small><input id="cSlug" readonly></label></div>' +
      '<label>Icono</label>' + iconPicker('cIco', 'etiqueta') + '<p></p><button class="btn" id="cAdd">Crear categoría</button></div>' +
      '<div class="card"><h2>Categorías (' + C.length + ')</h2><div class="list">' + C.map(function (c, i) {
        var n = S.data.productos.filter(function (p) { return p.categoria === c.slug; }).length;
        if (S.editing === 'c' + i) return '<div class="item" style="display:block"><label>Nombre<input id="ceNom" value="' + esc(c.nombre) + '"></label><label>Icono</label>' + iconPicker('ceIco', c.icono || c.slug) +
          '<p></p><div class="row"><button class="btn btn-sm" data-act="cSave" data-i="' + i + '">Guardar</button><button class="btn btn-ghost btn-sm" data-act="cCancel">Cancelar</button></div></div>';
        return '<div class="item"><span class="ico-prev">' + icon(c.icono || c.slug) + '</span><div class="t"><b>' + esc(c.nombre) + '</b><small>/categoria/' + esc(c.slug) + ' · ' + n + ' productos</small></div>' +
          '<div class="acts"><button class="btn btn-ghost btn-sm" data-act="cUp" data-i="' + i + '">↑</button><button class="btn btn-ghost btn-sm" data-act="cDown" data-i="' + i + '">↓</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="cEdit" data-i="' + i + '">Editar</button><button class="btn btn-danger btn-sm" data-act="cDel" data-i="' + i + '">Borrar</button></div></div>';
      }).join('') + '</div></div>';
  }
  function pickIcons(m) { m.querySelectorAll('.icons').forEach(function (box) { box.onclick = function (ev) { var b = ev.target.closest('[data-ico]'); if (!b) return; box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }; }); }
  function selIcon(id) { var b = $('#' + id + ' .on'); return b ? b.dataset.ico : 'etiqueta'; }
  bind.categorias = function (m) {
    var C = S.data.categorias; pickIcons(m);
    $('#cNom').oninput = function () { $('#cSlug').value = slugify(this.value); };
    $('#cAdd').onclick = function () {
      var nom = val('#cNom'), slug = slugify(nom);
      if (!nom || !slug) { toast('Escribe un nombre.', true); return; }
      if (C.some(function (c) { return c.slug === slug; })) { toast('Ya existe una categoría con ese nombre.', true); return; }
      var next = C.concat([{ slug: slug, nombre: nom, icono: selIcon('cIco') }]);
      saveFile('data/categorias.json', next, this).then(function () { S.data.categorias = next; render(); });
    };
    m.onclick = function (ev) {
      if (ev.target.closest('.icons')) return;
      var b = ev.target.closest('[data-act]'); if (!b) return; var i = +b.dataset.i, act = b.dataset.act, next;
      if (act === 'cEdit') { S.editing = 'c' + i; render(); }
      if (act === 'cCancel') { S.editing = null; render(); }
      if (act === 'cSave') { next = C.slice(); next[i] = Object.assign({}, next[i], { nombre: val('#ceNom') || next[i].nombre, icono: selIcon('ceIco') });
        saveFile('data/categorias.json', next, b).then(function () { S.data.categorias = next; S.editing = null; render(); }); }
      if (act === 'cDel') {
        var n = S.data.productos.filter(function (p) { return p.categoria === C[i].slug; }).length;
        if (n) { toast('No se puede borrar: tiene ' + n + ' productos. Muévelos antes a otra categoría.', true); return; }
        if (!confirm('¿Borrar la categoría «' + C[i].nombre + '»?')) return;
        next = C.slice(); next.splice(i, 1); saveFile('data/categorias.json', next, b).then(function () { S.data.categorias = next; render(); });
      }
      if (act === 'cUp' || act === 'cDown') { var j = act === 'cUp' ? i - 1 : i + 1; if (j < 0 || j >= C.length) return;
        next = C.slice(); var t = next[i]; next[i] = next[j]; next[j] = t; saveFile('data/categorias.json', next, b).then(function () { S.data.categorias = next; render(); }); }
    };
  };

  // ---------- TEXTOS Y DISEÑO ----------
  var CAMPOS = [
    ['Cabecera', [['logo_1', 'Logo (parte blanca)'], ['logo_2', 'Logo (parte de color)'], ['logo_sub', 'Subtítulo del logo']]],
    ['Portada · bloque principal', [['hero_kicker', 'Texto pequeño superior'], ['hero_titulo', 'Título'], ['hero_destacado', 'Final del título (en color)'], ['hero_texto', 'Texto bajo el título', 1], ['buscador_placeholder', 'Texto dentro del buscador'], ['boton_comparar', 'Botón del buscador'], ['mano', 'Frase manuscrita']]],
    ['Portada · títulos de secciones', [['cat_titulo', 'Categorías: título'], ['cat_destacado', 'Categorías: palabra en color'], ['prod_titulo', 'Productos: título'], ['prod_destacado', 'Productos: palabra en color'], ['guias_titulo', 'Guías: título'], ['guias_destacado', 'Guías: palabra en color'], ['nosotros_titulo', 'Sobre nosotros: título'], ['nosotros_destacado', 'Sobre nosotros: palabra en color'], ['nosotros_texto', 'Sobre nosotros: texto', 1]]],
    ['Pie de página y Google', [['pie_texto', 'Texto del pie', 1], ['seo_titulo', 'Título para Google (portada)'], ['seo_descripcion', 'Descripción para Google (portada)', 1]]],
  ];
  function vTextos() {
    var A = S.data.ajustes, T = A.textos, Co = A.colores;
    var feats = (T.feats || []).concat([{}, {}, {}, {}]).slice(0, 4), faq = T.faq || [];
    return '<div class="head"><h1>Textos y diseño</h1><button class="btn" id="tSave">Guardar cambios</button></div>' +
      '<div class="card"><h2>🎨 Colores y fondo</h2><div class="row">' +
      [['fondo', 'Fondo', '#0a0e0b'], ['tarjetas', 'Tarjetas', '#121a15'], ['acento', 'Color principal (botones)', '#ffd21f'], ['texto', 'Texto', '#f4f6f3']].map(function (c) {
        return '<label style="flex:1;min-width:150px">' + c[1] + '<input type="color" data-color="' + c[0] + '" value="' + esc(Co[c[0]] || c[2]) + '"></label>'; }).join('') + '</div>' +
      '<label>Imagen de fondo <small>(dirección https de una imagen; déjalo vacío para no usar imagen)</small><input id="tBg" value="' + esc(A.fondo_imagen || '') + '" placeholder="https://..."></label>' +
      '<button class="btn btn-ghost btn-sm" id="tReset">Restaurar colores originales</button></div>' +
      CAMPOS.map(function (g) { return '<div class="card"><h2>' + g[0] + '</h2>' + g[1].map(function (f) {
        return '<label>' + f[1] + (f[2] ? '<textarea data-t="' + f[0] + '">' + esc(T[f[0]] || '') + '</textarea>' : '<input data-t="' + f[0] + '" value="' + esc(T[f[0]] || '') + '">') + '</label>'; }).join('') + '</div>'; }).join('') +
      '<div class="card"><h2>Las 4 cajas bajo el buscador</h2>' + feats.map(function (f, i) {
        return '<div class="pair"><input data-feat="' + i + '" data-k="titulo" value="' + esc(f.titulo || '') + '" placeholder="Título"><input data-feat="' + i + '" data-k="texto" value="' + esc(f.texto || '') + '" placeholder="Texto"><span></span></div>'; }).join('') + '</div>' +
      '<div class="card"><h2>Preguntas frecuentes</h2><div id="faq">' + faq.map(faqRow).join('') + '</div><button class="btn btn-ghost btn-sm" id="fAdd">+ Añadir pregunta</button></div>' +
      '<button class="btn" id="tSave2">Guardar cambios</button>';
  }
  function faqRow(q) { return '<div class="pair faq"><input data-k="p" value="' + esc(q.p || '') + '" placeholder="Pregunta"><textarea data-k="r" placeholder="Respuesta">' + esc(q.r || '') + '</textarea><button class="btn btn-danger btn-sm" data-act="fDel">✕</button></div>'; }
  bind.textos = function (m) {
    $('#fAdd').onclick = function () { $('#faq').insertAdjacentHTML('beforeend', faqRow({})); };
    $('#tReset').onclick = function () { var d = { fondo: '#0a0e0b', tarjetas: '#121a15', acento: '#ffd21f', texto: '#f4f6f3' }; m.querySelectorAll('[data-color]').forEach(function (i) { i.value = d[i.dataset.color]; }); };
    m.onclick = function (ev) { var b = ev.target.closest('[data-act="fDel"]'); if (b) b.closest('.faq').remove(); };
    function save() {
      var A = JSON.parse(JSON.stringify(S.data.ajustes));
      m.querySelectorAll('[data-color]').forEach(function (i) { A.colores[i.dataset.color] = i.value; });
      var bg = val('#tBg'); if (bg && !/^https:\/\//.test(bg)) { toast('La imagen de fondo debe empezar por https://', true); return; }
      A.fondo_imagen = bg;
      m.querySelectorAll('[data-t]').forEach(function (i) { A.textos[i.dataset.t] = i.value.trim(); });
      var feats = [{}, {}, {}, {}]; m.querySelectorAll('[data-feat]').forEach(function (i) { feats[+i.dataset.feat][i.dataset.k] = i.value.trim(); }); A.textos.feats = feats;
      A.textos.faq = [].map.call(m.querySelectorAll('.faq'), function (r) { return { p: r.querySelector('[data-k=p]').value.trim(), r: r.querySelector('[data-k=r]').value.trim() }; }).filter(function (q) { return q.p; });
      saveFile('data/ajustes.json', A, this).then(function () { S.data.ajustes = A; });
    }
    $('#tSave').onclick = save; $('#tSave2').onclick = save;
  };

  // ---------- EDITOR HTML (guías y páginas) ----------
  function editorHtml(html) {
    return '<div class="toolbar" id="tb"><button type="button" data-cmd="formatBlock" data-v="H2">Título</button><button type="button" data-cmd="formatBlock" data-v="P">Párrafo</button>' +
      '<button type="button" data-cmd="bold"><b>N</b></button><button type="button" data-cmd="italic"><i>C</i></button><button type="button" data-cmd="insertUnorderedList">• Lista</button>' +
      '<button type="button" data-cmd="insertOrderedList">1. Lista</button><button type="button" data-cmd="createLink">Enlace</button><button type="button" data-cmd="removeFormat">Quitar formato</button>' +
      '<button type="button" id="tbHtml" style="margin-left:auto">&lt;/&gt; HTML</button></div>' +
      '<div class="editor" id="ed" contenteditable="true">' + (html || '<p></p>') + '</div><textarea class="htmlbox" id="edHtml" hidden></textarea>';
  }
  function bindEditor() {
    var ed = $('#ed'), box = $('#edHtml');
    $('#tb').onclick = function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'tbHtml') { if (box.hidden) { box.value = ed.innerHTML; box.hidden = false; ed.hidden = true; } else { ed.innerHTML = box.value; box.hidden = true; ed.hidden = false; } return; }
      ed.focus(); var v = b.dataset.v || null;
      if (b.dataset.cmd === 'createLink') { v = prompt('Dirección del enlace (https://...)'); if (!v) return; }
      document.execCommand(b.dataset.cmd, false, v);
    };
  }
  function editorValue() { var ed = $('#ed'), box = $('#edHtml'); return (box.hidden ? ed.innerHTML : box.value).trim(); }

  // ---------- GUÍAS ----------
  function vGuias() {
    var G = S.data.guias.slice().sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    if (S.editing && S.editing.tipo === 'guia') {
      var g = S.editing.obj;
      return '<div class="head"><h1>' + (S.editing.nuevo ? 'Nueva guía' : 'Editar guía') + '</h1><div class="row"><button class="btn btn-ghost" id="gBack">← Volver</button><button class="btn" id="gSave">Guardar</button></div></div>' +
        '<div class="card"><label>Título<input id="gTit" value="' + esc(g.titulo) + '"></label>' +
        '<div class="grid3"><label>Dirección<input id="gSlug" value="' + esc(g.slug) + '"' + (S.editing.nuevo ? '' : ' readonly') + '></label><label>Categoría<select id="gCat">' + catOptions(g.categoria) + '</select></label><label>Fecha<input id="gFecha" type="date" value="' + esc(g.fecha || today()) + '"></label></div>' +
        '<label>Descripción breve<textarea id="gDesc" maxlength="300">' + esc(g.descripcion) + '</textarea></label>' +
        '<label>Búsqueda en Amazon <small>(palabras para los botones «mejor valorados / más baratos» al final de la guía)</small><input id="gBus" value="' + esc(g.busqueda || '') + '"></label>' +
        '<label>Contenido</label>' + editorHtml(g.html) + '</div>';
    }
    return '<div class="head"><h1>Guías</h1><button class="btn" id="gNew">+ Nueva guía</button></div><div class="card"><div class="list">' +
      (G.length ? G.map(function (g) { return '<div class="item"><div class="t"><b>' + esc(g.titulo) + '</b><small>' + esc(catName(g.categoria)) + ' · ' + esc(g.fecha) + ' · /guias/' + esc(g.slug) + '</small></div><div class="acts">' +
        '<a class="btn btn-ghost btn-sm" href="/guias/' + esc(g.slug) + '" target="_blank">Ver</a><button class="btn btn-ghost btn-sm" data-act="gEdit" data-s="' + esc(g.slug) + '">Editar</button><button class="btn btn-danger btn-sm" data-act="gDel" data-s="' + esc(g.slug) + '">Borrar</button></div></div>'; }).join('') : '<p class="muted">Todavía no hay guías.</p>') + '</div></div>';
  }
  bind.guias = function (m) {
    if (S.editing && S.editing.tipo === 'guia') {
      bindEditor();
      if (S.editing.nuevo) $('#gTit').oninput = function () { $('#gSlug').value = slugify(this.value); };
      $('#gBack').onclick = function () { S.editing = null; render(); };
      $('#gSave').onclick = function () {
        var slug = slugify(val('#gSlug')); if (!val('#gTit') || !slug) { toast('Pon un título.', true); return; }
        if (S.editing.nuevo && S.data.guias.some(function (x) { return x.slug === slug; })) { toast('Ya existe una guía con esa dirección.', true); return; }
        var g = { slug: slug, titulo: val('#gTit'), descripcion: val('#gDesc'), categoria: val('#gCat'), fecha: val('#gFecha') || today(), busqueda: val('#gBus'), html: editorValue() };
        if (S.editing.obj.productos) g.productos = S.editing.obj.productos;
        saveFile('data/guias/' + slug + '.json', g, this).then(function () {
          S.data.guias = S.data.guias.filter(function (x) { return x.slug !== slug; }).concat([g]); S.editing = null; render(); });
      };
      return;
    }
    $('#gNew').onclick = function () { S.editing = { tipo: 'guia', nuevo: true, obj: { titulo: '', slug: '', categoria: (S.data.categorias[0] || {}).slug, fecha: today(), descripcion: '', html: '<p></p>' } }; render(); };
    m.onclick = function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var g = S.data.guias.find(function (x) { return x.slug === b.dataset.s; });
      if (b.dataset.act === 'gEdit') { S.editing = { tipo: 'guia', obj: g }; render(); }
      if (b.dataset.act === 'gDel') { if (!confirm('¿Borrar la guía «' + g.titulo + '»?')) return; busy(b, true);
        api('DELETE', 'archivo?ruta=' + encodeURIComponent('data/guias/' + g.slug + '.json')).then(function () { toast('🗑️ Guía borrada.'); S.data.guias = S.data.guias.filter(function (x) { return x !== g; }); render(); }).catch(function (e) { toast('❌ ' + e.message, true); busy(b, false); }); }
    };
  };

  // ---------- PÁGINAS ----------
  function vPaginas() {
    var P = S.data.paginas;
    if (S.editing && S.editing.tipo === 'pagina') {
      var p = S.editing.obj;
      return '<div class="head"><h1>' + (S.editing.nuevo ? 'Nueva página' : 'Editar página') + '</h1><div class="row"><button class="btn btn-ghost" id="pgBack">← Volver</button><button class="btn" id="pgSave">Guardar</button></div></div>' +
        '<div class="card"><div class="grid3"><label>Título<input id="pgTit" value="' + esc(p.titulo) + '"></label><label>Dirección<input id="pgSlug" value="' + esc(p.slug) + '"' + (S.editing.nuevo ? '' : ' readonly') + '></label><label>Última actualización<input id="pgAct" value="' + esc(p.actualizado || '') + '"></label></div>' +
        '<label>Contenido</label>' + editorHtml(p.html) + '</div>';
    }
    return '<div class="head"><h1>Páginas legales</h1><button class="btn" id="pgNew">+ Nueva página</button></div><p class="muted">Aparecen en el pie de la web, en la columna «Legal».</p><div class="card"><div class="list">' +
      P.map(function (p) { return '<div class="item"><div class="t"><b>' + esc(p.titulo) + '</b><small>/' + esc(p.slug) + '</small></div><div class="acts"><a class="btn btn-ghost btn-sm" href="/' + esc(p.slug) + '" target="_blank">Ver</a>' +
        '<button class="btn btn-ghost btn-sm" data-act="pgEdit" data-s="' + esc(p.slug) + '">Editar</button><button class="btn btn-danger btn-sm" data-act="pgDel" data-s="' + esc(p.slug) + '">Borrar</button></div></div>'; }).join('') + '</div></div>';
  }
  function fechaLarga() { var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], d = new Date(); return d.getDate() + ' de ' + m[d.getMonth()] + ' de ' + d.getFullYear(); }
  bind.paginas = function (m) {
    if (S.editing && S.editing.tipo === 'pagina') {
      bindEditor();
      if (S.editing.nuevo) $('#pgTit').oninput = function () { $('#pgSlug').value = slugify(this.value); };
      $('#pgBack').onclick = function () { S.editing = null; render(); };
      $('#pgSave').onclick = function () {
        var slug = slugify(val('#pgSlug')); if (!val('#pgTit') || !slug) { toast('Pon un título.', true); return; }
        if (['index', 'comparar', 'categorias', 'contacto', 'admin', 'guias', 'producto', 'categoria'].indexOf(slug) >= 0) { toast('Esa dirección está reservada. Elige otra.', true); return; }
        var p = { slug: slug, titulo: val('#pgTit'), actualizado: val('#pgAct') || fechaLarga(), html: editorValue() };
        saveFile('data/paginas/' + slug + '.json', p, this).then(function () { S.data.paginas = S.data.paginas.filter(function (x) { return x.slug !== slug; }).concat([p]); S.editing = null; render(); });
      };
      return;
    }
    $('#pgNew').onclick = function () { S.editing = { tipo: 'pagina', nuevo: true, obj: { titulo: '', slug: '', actualizado: fechaLarga(), html: '<p></p>' } }; render(); };
    m.onclick = function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var p = S.data.paginas.find(function (x) { return x.slug === b.dataset.s; });
      if (b.dataset.act === 'pgEdit') { S.editing = { tipo: 'pagina', obj: p }; render(); }
      if (b.dataset.act === 'pgDel') { if (!confirm('¿Borrar la página «' + p.titulo + '»? Algunas páginas legales son obligatorias.')) return; busy(b, true);
        api('DELETE', 'archivo?ruta=' + encodeURIComponent('data/paginas/' + p.slug + '.json')).then(function () { toast('🗑️ Página borrada.'); S.data.paginas = S.data.paginas.filter(function (x) { return x !== p; }); render(); }).catch(function (e) { toast('❌ ' + e.message, true); busy(b, false); }); }
    };
  };

  // ---------- USUARIOS ----------
  function vUsuarios() {
    return '<div class="head"><h1>Usuarios</h1></div>' +
      '<div class="card"><h2>➕ Nuevo usuario</h2><div class="grid3"><label>Usuario<input id="uNom" autocomplete="off"></label><label>Contraseña <small>(mín. 8)</small><input id="uPass" type="password" autocomplete="new-password"></label>' +
      '<label>Permisos<select id="uRol"><option value="editor">Editor (contenido)</option><option value="admin">Administrador (todo, también usuarios)</option></select></label></div><button class="btn" id="uAdd">Crear usuario</button></div>' +
      '<div class="card"><h2>Usuarios con acceso</h2><div class="list" id="uList"><span class="spin"></span></div></div>';
  }
  bind.usuarios = function (m) {
    function load() {
      api('GET', 'usuarios').then(function (j) {
        $('#uList').innerHTML = j.usuarios.map(function (u) { return '<div class="item"><div class="t"><b>' + esc(u.name) + (u.name.toLowerCase() === S.user.toLowerCase() ? ' (tú)' : '') + '</b><small>' + (u.role === 'admin' ? 'Administrador' : 'Editor') + ' · desde ' + esc((u.created || '').slice(0, 10)) + '</small></div>' +
          '<div class="acts"><button class="btn btn-ghost btn-sm" data-act="uPass" data-u="' + esc(u.name) + '" data-r="' + u.role + '">Cambiar contraseña</button>' +
          (u.name.toLowerCase() !== S.user.toLowerCase() ? '<button class="btn btn-danger btn-sm" data-act="uDel" data-u="' + esc(u.name) + '">Borrar</button>' : '') + '</div></div>'; }).join('');
      }).catch(function (e) { $('#uList').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
    }
    load();
    $('#uAdd').onclick = function () { var b = this; busy(b, true);
      api('POST', 'usuarios', { usuario: val('#uNom'), clave: $('#uPass').value, rol: val('#uRol') }).then(function () { toast('✅ Usuario creado.'); $('#uNom').value = ''; $('#uPass').value = ''; load(); })
        .catch(function (e) { toast('❌ ' + e.message, true); }).finally(function () { busy(b, false); }); };
    m.onclick = function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var u = b.dataset.u;
      if (b.dataset.act === 'uDel') { if (!confirm('¿Quitar el acceso a «' + u + '»?')) return;
        api('DELETE', 'usuarios/' + encodeURIComponent(u)).then(function () { toast('🗑️ Usuario borrado.'); load(); }).catch(function (e) { toast('❌ ' + e.message, true); }); }
      if (b.dataset.act === 'uPass') { var p = prompt('Nueva contraseña para «' + u + '» (mínimo 8 caracteres):'); if (!p) return;
        api('POST', 'usuarios/' + encodeURIComponent(u) + '/clave', { clave: p, rol: b.dataset.r }).then(function () { toast('✅ Contraseña cambiada.'); if (u.toLowerCase() === S.user.toLowerCase()) logout(); })
          .catch(function (e) { toast('❌ ' + e.message, true); }); }
    };
  };

  // ---------- MI CUENTA ----------
  function vCuenta() {
    return '<div class="head"><h1>Mi cuenta</h1></div><div class="card" style="max-width:460px"><h2>Cambiar mi contraseña</h2>' +
      '<label>Contraseña actual<input id="aOld" type="password" autocomplete="current-password"></label><label>Nueva contraseña <small>(mín. 8)</small><input id="aNew" type="password" autocomplete="new-password"></label>' +
      '<label>Repite la nueva<input id="aNew2" type="password" autocomplete="new-password"></label><button class="btn" id="aSave">Cambiar contraseña</button></div>';
  }
  bind.cuenta = function () {
    $('#aSave').onclick = function () {
      if ($('#aNew').value !== $('#aNew2').value) { toast('Las contraseñas nuevas no coinciden.', true); return; }
      var b = this; busy(b, true);
      api('POST', 'clave', { actual: $('#aOld').value, nueva: $('#aNew').value }).then(function (j) { S.token = j.token; try { sessionStorage.setItem('tc_token', j.token); } catch (e) {} toast('✅ Contraseña cambiada.'); render(); })
        .catch(function (e) { toast('❌ ' + e.message, true); }).finally(function () { busy(b, false); });
    };
  };
})();
