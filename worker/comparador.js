/**
 * Todo Chollos Online — API del comparador (Cloudflare Worker).
 *
 * GET /?u=<enlace de Amazon o ASIN>
 * Devuelve el producto original y tres alternativas comparables:
 *   - barato:   la alternativa relevante más barata que el original
 *   - valorado: la mejor valorada (Amazon ordena por valoración media, mín. 4 estrellas)
 *   - popular:  la alternativa más relevante/destacada según Amazon
 *
 * Variables (Settings > Variables and Secrets):
 *   AMZ_CLIENT_ID      (secreto)  ID de credencial de la Creators API
 *   AMZ_CLIENT_SECRET  (secreto)  Secreto de esa credencial
 *   PARTNER_TAG        (texto)    deskfind-21
 */

const MARKETPLACE = 'www.amazon.es';
const TOKEN_URL = 'https://api.amazon.co.uk/auth/o2/token';
const API = 'https://creatorsapi.amazon/catalog/v1';
const ALLOWED_ORIGINS = ['https://todochollosonline.es', 'https://www.todochollosonline.es'];
const RESOURCES = [
  'images.primary.large', 'images.primary.medium', 'itemInfo.title', 'itemInfo.byLineInfo',
  'offersV2.listings.price', 'offersV2.listings.availability', 'offersV2.listings.isBuyBoxWinner',
];
const CACHE_SECONDS = 3600;

let tokenCache = { value: null, exp: 0 };

// Lee "a.b.c" aceptando camelCase o PascalCase
function g(o, path) {
  for (const k of path.split('.')) {
    if (o == null || typeof o !== 'object') return undefined;
    o = k in o ? o[k] : o[k[0].toUpperCase() + k.slice(1)];
  }
  return o;
}

function normalize(it, tag) {
  const listings = g(it, 'offersV2.listings') || [];
  const l = listings.find(x => g(x, 'isBuyBoxWinner')) || listings[0];
  const asin = g(it, 'asin');
  return {
    asin,
    title: g(it, 'itemInfo.title.displayValue') || '',
    brand: g(it, 'itemInfo.byLineInfo.brand.displayValue') || '',
    image: g(it, 'images.primary.large.url') || g(it, 'images.primary.medium.url') || '',
    price: l ? g(l, 'price.money.displayAmount') : null,
    amount: l ? g(l, 'price.money.amount') : null,
    oldPrice: l ? g(l, 'price.savingBasis.money.displayAmount') : null,
    savings: l ? g(l, 'price.savings.percentage') : null,
    url: `https://${MARKETPLACE}/dp/${asin}?tag=${tag}`,
  };
}

async function token(env) {
  if (tokenCache.value && tokenCache.exp > Date.now() + 60000) return tokenCache.value;
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: (env.AMZ_CLIENT_ID || '').trim(),
      client_secret: (env.AMZ_CLIENT_SECRET || '').trim(),
      scope: 'creatorsapi::default',
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('token ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  tokenCache = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastCall = 0;

// Amazon permite ~1 petición por segundo: espaciamos las llamadas y reintentamos si nos frena (429).
async function call(env, op, payload) {
  const tag = env.PARTNER_TAG || 'deskfind-21';
  for (let i = 0; i < 5; i++) {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const t = await token(env);
    const r = await fetch(`${API}/${op}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', 'x-marketplace': MARKETPLACE },
      body: JSON.stringify({ marketplace: MARKETPLACE, partnerTag: tag, resources: RESOURCES, ...payload }),
    });
    if (r.status === 401 && i === 0) { tokenCache = { value: null, exp: 0 }; continue; }
    if (r.status === 429 && i < 4) { await sleep(1200 * (i + 1)); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(op + ' ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
    return j;
  }
}

// Saca el ASIN de un enlace (resuelve enlaces cortos amzn.eu / amzn.to)
async function asinFrom(input) {
  input = (input || '').trim();
  if (/^[A-Z0-9]{10}$/i.test(input)) return input.toUpperCase();
  const m = input.match(/\/(?:dp|gp\/product|gp\/aw\/d|product|ASIN)\/([A-Z0-9]{10})/i);
  if (m) return m[1].toUpperCase();
  if (/^https?:\/\/(amzn\.(eu|to)|a\.co)\//i.test(input)) {
    const r = await fetch(input, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    const m2 = loc.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i);
    if (m2) return m2[1].toUpperCase();
  }
  return null;
}

// Palabras clave genéricas a partir del título (sin marca ni detalles)
function keywords(title, brand) {
  const stop = new Set(['de', 'para', 'con', 'y', 'el', 'la', 'los', 'las', 'en', 'a', 'un', 'una', 'del', 'por', 'sin', '-', '–', '|']);
  const b = (brand || '').toLowerCase();
  return title.split(/[\s,|()\[\]:;–\-\/]+/)
    .filter(w => w && !stop.has(w.toLowerCase()) && w.toLowerCase() !== b && !/^\d+([.,]\d+)?$/.test(w))
    .slice(0, 5).join(' ');
}

async function compare(env, input) {
  const tag = env.PARTNER_TAG || 'deskfind-21';
  const asin = await asinFrom(input);
  if (!asin) return { error: 'enlace', message: 'No reconocemos el producto. Pega el enlace de la ficha de Amazon.' };

  const got = await call(env, 'getItems', { itemIds: [asin], itemIdType: 'ASIN' });
  const it = (g(got, 'itemsResult.items') || [])[0];
  if (!it) return { error: 'producto', message: 'Amazon no ha devuelto este producto. Puede que no esté disponible en Amazon.es.' };
  const original = normalize(it, tag);
  const kw = keywords(original.title, original.brand) || original.title.slice(0, 60);

  const price = original.amount || 0;
  const relevant = await call(env, 'searchItems', { keywords: kw, itemCount: 10, sortBy: 'Relevance' });
  const rated = await call(env, 'searchItems', {
    keywords: kw, itemCount: 10, sortBy: 'AvgCustomerReviews', minReviewsRating: 4,
    ...(price ? { minPrice: Math.round(price * 50), maxPrice: Math.round(price * 150) } : {}),
  }).catch(() => null);

  // Descarta el propio producto y sus variantes (misma marca y mismo inicio de título, p. ej. otra talla o color)
  const head = t => t.toLowerCase().split(/[\s,]+/).slice(0, 6).join(' ');
  const variant = x => x.asin === asin || (x.brand && x.brand === original.brand && head(x.title) === head(original.title));
  const list = r => (g(r, 'searchResult.items') || []).map(x => normalize(x, tag)).filter(x => x.price && !variant(x));
  const rel = list(relevant);
  const used = new Set([asin]);
  const pick = x => { if (x) used.add(x.asin); return x || null; };

  const cheaper = rel.filter(x => !price || (x.amount < price && x.amount >= price * 0.3)).sort((a, b) => a.amount - b.amount);
  const barato = pick(cheaper[0]);
  const valorado = pick(list(rated).find(x => !used.has(x.asin)) || rel.find(x => !used.has(x.asin)));
  const popular = pick(rel.find(x => !used.has(x.asin)));

  return {
    original,
    opciones: { barato, valorado, popular },
    busqueda: `https://${MARKETPLACE}/s?k=${encodeURIComponent(kw)}&tag=${tag}`,
    actualizado: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const input = url.searchParams.get('u') || '';
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra },
    });
    if (!input) return json({ ok: true, servicio: 'Comparador Todo Chollos Online' });

    // Caché de 1 hora por producto
    const asinKey = (input.match(/[A-Z0-9]{10}/i) || [input])[0].toUpperCase();
    const cacheKey = new Request(`https://cache.todochollos/v2/${encodeURIComponent(asinKey)}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) { const r = new Response(hit.body, hit); Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v)); return r; }

    try {
      const data = await compare(env, input);
      const res = json(data, data.error ? 400 : 200, data.error ? {} : { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
      if (!data.error) ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      console.log('ERROR', e.message);
      return json({ error: 'amazon', message: 'No hemos podido consultar Amazon ahora mismo. Inténtalo en unos minutos.' }, 502);
    }
  },
};
