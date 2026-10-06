<?php $u = explode('@', cfg()['contact_email']); ?>
<section class="wrap section article">
  <h1>Contacto</h1>
  <p class="lead">Escríbenos para comunicar una corrección, consultar cómo trabajamos o ejercer tus derechos de privacidad.</p>
  <p>No gestionamos pagos, envíos, devoluciones ni garantías de Amazon: para eso usa la ayuda del pedido dentro de Amazon.</p>
  <div class="panel">
    <p><b>Correo electrónico:</b> <a id="mail" href="#">mostrar dirección</a></p>
    <p class="small">Usaremos tus datos solo para responder a tu consulta (ver <a href="/privacidad">privacidad</a>). No envíes contraseñas, datos bancarios ni información de pedidos.</p>
  </div>
</section>
<script>
(function () {
  var a = document.getElementById('mail'), u = <?= json_encode($u[0]) ?>, d = <?= json_encode($u[1] ?? '') ?>;
  a.addEventListener('click', function (ev) {
    if (a.dataset.on) return;
    ev.preventDefault(); a.dataset.on = 1;
    a.textContent = u + '@' + d; a.href = 'mailto:' + u + '@' + d + '?subject=' + encodeURIComponent('Consulta desde Todo Chollos Online');
  });
})();
</script>
