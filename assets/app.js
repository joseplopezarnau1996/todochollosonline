// Filtro de categorías en la portada
document.querySelectorAll('.filter').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.filter').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    var f = b.getAttribute('data-f');
    document.querySelectorAll('#productos .card').forEach(function (c) {
      c.hidden = !!f && c.getAttribute('data-cat') !== f;
    });
  });
});
// Cerrar el menú móvil al pulsar un enlace
document.querySelectorAll('.nav a').forEach(function (a) {
  a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
});
