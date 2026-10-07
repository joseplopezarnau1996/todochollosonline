</main>
<?= buscador_amazon('sobre_pie') ?>
<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="/">
          <span class="logo-ico"><?= icon('box', 22) ?></span>
          <span class="logo-txt"><b><?= e(aj('textos.logo_1', 'Todo')) ?><em><?= e(aj('textos.logo_2', 'Chollos')) ?></em></b><small><?= e(aj('textos.logo_sub', 'Comparador de precios')) ?></small></span>
        </a>
        <p class="aff">En calidad de Afiliado de Amazon, obtengo ingresos por las compras adscritas que cumplen los requisitos aplicables.</p>
        <p class="small"><?= e(aj('textos.pie_texto')) ?></p>
      </div>
      <div>
        <h4>Explorar</h4>
        <a href="/#comparador">Comparador</a>
        <a href="/categorias">Categorías</a>
        <a href="/#productos">Productos</a>
        <a href="/guias/">Guías de compra</a>
      </div>
      <div>
        <h4>Legal</h4>
        <?php foreach (paginas() as $pg): ?><a href="/<?= e($pg['slug']) ?>"><?= e($pg['titulo']) ?></a><?php endforeach; ?>
        <a href="/contacto">Contacto</a>
      </div>
    </div>
    <p class="small copy">© <?= date('Y') ?> Todo Chollos Online · Amazon y el logotipo de Amazon son marcas registradas de Amazon.com, Inc. o sus filiales.</p>
  </div>
</footer>
<script src="/assets/app.js?v=<?= defined('BUILD_VERSION') ? BUILD_VERSION : 2 ?>" defer></script>
</body>
</html>
