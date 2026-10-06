# Todo Chollos Online

Web de chollos de Amazon (https://todochollosonline.es) generada como sitio estático y publicada gratis en GitHub Pages.

- `data/productos.json` — productos (ASIN, categoría, título, descripción).
- `data/categorias.json` — categorías.
- `data/guias/*.json` — guías de compra.
- `plantillas/` — diseño de cada página. `assets/` — estilos y JS.
- `build.php` — genera la web en `_site/` consultando precios con la Amazon Creators API.
- `.github/workflows/publicar.yml` — regenera y publica la web en cada cambio y cada hora.

Claves de Amazon: Settings → Secrets and variables → Actions → `AMZ_CLIENT_ID` y `AMZ_CLIENT_SECRET`.
