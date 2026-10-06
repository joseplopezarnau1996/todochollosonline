/**
 * Todo Chollos Online — API del comparador (Cloudflare Worker).
 *
 * GET /?u=<enlace de Amazon o ASIN>
 * Devuelve el producto original y tres alternativas comparables:
 *   - barato:   la alternativa relevante más barata que el original
 *   - valorado: la mejor valorada (Amazon ordena por valoración media, mín. 4 estrellas)
 *   - popular:  la alternativa más relevante/destacada según Amazon
 *
 * Además sirve la API del área privada (/api/...) para el panel todochollosonline.es/admin.
 *
 * Variables (Settings > Variables and Secrets):
 *   AMZ_CLIENT_ID      (secreto)  ID de credencial de la Creators API
 *   AMZ_CLIENT_SECRET  (secreto)  Secreto de esa credencial
 *   PARTNER_TAG        (texto)    deskfind-21
 *   GITHUB_TOKEN       (secreto)  Token de GitHub con permiso de escritura en el repositorio
 * Binding KV:
 *   DB                 Espacio KV donde se guardan usuarios y sesiones
 */

const REPO = 'joseplopezarnau1996/todochollosonline';

const MARKETPLACE = 'www.amazon.es';
const TOKEN_URL = 'https://api.amazon.co.uk/auth/o2/token';
const API = 'https://creatorsapi.amazon/catalog/v1';
const ALLOWED_ORIGINS = ['https://todochollosonline.es', 'https://www.todochollosonline.es'];
const RESOURCES = [
  'images.primary.large', 'images.primary.medium', 'itemInfo.title', 'itemInfo.byLineInfo', 'itemInfo.features',
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
    features: (g(it, 'itemInfo.features.displayValues') || []).slice(0, 5),
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

// ======================================================================
//  ÁREA PRIVADA
// ======================================================================
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const utf8ToB64 = str => { const bytes = enc.encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const b64ToUtf8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

async function hashPassword(pass, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return hex(bits);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sessionKey(env) {
  let k = await env.DB.get('session_key');
  if (!k) { k = randHex(32); await env.DB.put('session_key', k); }
  return crypto.subtle.importKey('raw', enc.encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function makeToken(env, user) {
  const payload = b64url(enc.encode(JSON.stringify({ u: user.name, r: user.role, v: user.ver || 1, exp: Date.now() + 7 * 86400000 })));
  const sig = b64url(await crypto.subtle.sign('HMAC', await sessionKey(env), enc.encode(payload)));
  return payload + '.' + sig;
}

async function auth(env, request) {
  const t = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  const [payload, sig] = t.split('.');
  if (!payload || !sig) throw new HttpError(401, 'Inicia sesión.');
  const good = b64url(await crypto.subtle.sign('HMAC', await sessionKey(env), enc.encode(payload)));
  if (!safeEqual(good, sig)) throw new HttpError(401, 'Sesión no válida.');
  const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
  if (data.exp < Date.now()) throw new HttpError(401, 'La sesión ha caducado. Vuelve a entrar.');
  const user = await getUser(env, data.u);
  if (!user || (user.ver || 1) !== data.v) throw new HttpError(401, 'Sesión no válida.');
  return user;
}

const userKey = name => 'user:' + name.toLowerCase();
async function getUser(env, name) { return name ? env.DB.get(userKey(name), 'json') : null; }
async function listUsers(env) {
  const l = await env.DB.list({ prefix: 'user:' });
  const out = [];
  for (const k of l.keys) { const u = await env.DB.get(k.name, 'json'); if (u) out.push({ name: u.name, role: u.role, created: u.created }); }
  return out;
}
function checkNewUser(name, pass) {
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(name || '')) throw new HttpError(400, 'El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion).');
  if ((pass || '').length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
}
async function saveUser(env, name, pass, role, prev) {
  const salt = randHex(16);
  const u = { name, role: role === 'admin' ? 'admin' : 'editor', salt, hash: await hashPassword(pass, salt), created: prev?.created || new Date().toISOString(), ver: (prev?.ver || 0) + 1 };
  await env.DB.put(userKey(name), JSON.stringify(u));
  return u;
}

// ---------- GitHub ----------
const ALLOWED_PATH = /^data\/((productos|categorias|ajustes)\.json|(guias|paginas)\/[a-z0-9-]{1,80}\.json)$/;
async function gh(env, method, path, body) {
  if (!env.GITHUB_TOKEN) throw new HttpError(500, 'Falta configurar GITHUB_TOKEN en Cloudflare.');
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method,
    headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN.trim(), 'User-Agent': 'todochollos-panel', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, 'GitHub: ' + (j.message || r.status));
  return j;
}
async function readJson(env, path) {
  const f = await gh(env, 'GET', path + '?ref=main');
  return f ? { data: JSON.parse(b64ToUtf8(f.content)), sha: f.sha } : { data: null, sha: null };
}
async function readDir(env, dir) {
  const list = await gh(env, 'GET', dir + '?ref=main') || [];
  const out = [];
  for (const f of list) if (f.type === 'file' && f.name.endsWith('.json')) out.push((await readJson(env, f.path)).data);
  return out;
}

// ---------- Rutas /api ----------
async function api(request, env, url) {
  if (!env.DB) throw new HttpError(500, 'Falta conectar el espacio KV "DB" en Cloudflare.');
  const path = url.pathname.replace(/^\/api\/?/, '');
  const m = request.method;
  const body = (m === 'POST' || m === 'PUT') ? await request.json().catch(() => ({})) : {};
  const ip = request.headers.get('CF-Connecting-IP') || 'x';

  if (path === 'estado' && m === 'GET') {
    const l = await env.DB.list({ prefix: 'user:', limit: 1 });
    return { hayUsuarios: l.keys.length > 0, github: !!env.GITHUB_TOKEN };
  }
  if (path === 'setup' && m === 'POST') {
    const l = await env.DB.list({ prefix: 'user:', limit: 1 });
    if (l.keys.length) throw new HttpError(403, 'Ya existe un usuario administrador.');
    checkNewUser(body.usuario, body.clave);
    const u = await saveUser(env, body.usuario, body.clave, 'admin');
    return { token: await makeToken(env, u), usuario: u.name, rol: u.role };
  }
  if (path === 'login' && m === 'POST') {
    const failKey = 'fail:' + ip;
    const fails = parseInt(await env.DB.get(failKey) || '0', 10);
    if (fails >= 10) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.');
    const u = await getUser(env, body.usuario || '');
    const ok = u && safeEqual(await hashPassword(body.clave || '', u.salt), u.hash);
    if (!ok) { await env.DB.put(failKey, String(fails + 1), { expirationTtl: 900 }); throw new HttpError(401, 'Usuario o contraseña incorrectos.'); }
    await env.DB.delete(failKey);
    return { token: await makeToken(env, u), usuario: u.name, rol: u.role };
  }

  // A partir de aquí, hay que haber iniciado sesión
  const me = await auth(env, request);
  const admin = () => { if (me.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede hacer esto.'); };

  if (path === 'yo' && m === 'GET') return { usuario: me.name, rol: me.role };
  if (path === 'clave' && m === 'POST') {
    if (!safeEqual(await hashPassword(body.actual || '', me.salt), me.hash)) throw new HttpError(400, 'La contraseña actual no es correcta.');
    checkNewUser(me.name, body.nueva);
    const u = await saveUser(env, me.name, body.nueva, me.role, me);
    return { ok: true, token: await makeToken(env, u) };
  }
  if (path === 'usuarios' && m === 'GET') { admin(); return { usuarios: await listUsers(env) }; }
  if (path === 'usuarios' && m === 'POST') {
    admin(); checkNewUser(body.usuario, body.clave);
    if (await getUser(env, body.usuario)) throw new HttpError(400, 'Ese usuario ya existe.');
    await saveUser(env, body.usuario, body.clave, body.rol);
    return { ok: true };
  }
  let um = path.match(/^usuarios\/([^/]+)$/);
  if (um && m === 'DELETE') {
    admin(); const name = decodeURIComponent(um[1]);
    if (name.toLowerCase() === me.name.toLowerCase()) throw new HttpError(400, 'No puedes borrar tu propio usuario.');
    await env.DB.delete(userKey(name)); return { ok: true };
  }
  um = path.match(/^usuarios\/([^/]+)\/clave$/);
  if (um && m === 'POST') {
    admin(); const name = decodeURIComponent(um[1]); const u = await getUser(env, name);
    if (!u) throw new HttpError(404, 'Usuario no encontrado.');
    checkNewUser(u.name, body.clave);
    await saveUser(env, u.name, body.clave, body.rol || u.role, u); return { ok: true };
  }

  if (path === 'contenido' && m === 'GET') {
    const [productos, categorias, ajustes] = await Promise.all(['productos', 'categorias', 'ajustes'].map(n => readJson(env, `data/${n}.json`).then(r => r.data)));
    return { productos: productos || [], categorias: categorias || [], ajustes: ajustes || {}, guias: await readDir(env, 'data/guias'), paginas: await readDir(env, 'data/paginas') };
  }
  if (path === 'archivo' && m === 'PUT') {
    const ruta = String(body.ruta || '');
    if (!ALLOWED_PATH.test(ruta)) throw new HttpError(400, 'Ruta no permitida.');
    const cur = await gh(env, 'GET', ruta + '?ref=main');
    const content = JSON.stringify(body.datos, null, 4) + '\n';
    await gh(env, 'PUT', ruta, { message: `Panel: ${ruta} (${me.name})`, content: utf8ToB64(content), branch: 'main', ...(cur ? { sha: cur.sha } : {}) });
    return { ok: true };
  }
  if (path === 'archivo' && m === 'DELETE') {
    const ruta = url.searchParams.get('ruta') || '';
    if (!/^data\/(guias|paginas)\/[a-z0-9-]{1,80}\.json$/.test(ruta)) throw new HttpError(400, 'Ruta no permitida.');
    const cur = await gh(env, 'GET', ruta + '?ref=main');
    if (cur) await gh(env, 'DELETE', ruta, { message: `Panel: borrar ${ruta} (${me.name})`, sha: cur.sha, branch: 'main' });
    return { ok: true };
  }
  if (path === 'producto' && m === 'GET') {
    const tag = env.PARTNER_TAG || 'deskfind-21';
    const asin = await asinFrom(url.searchParams.get('u') || '');
    if (!asin) throw new HttpError(400, 'No reconozco ese enlace. Pega la URL de la ficha de Amazon.');
    const got = await call(env, 'getItems', { itemIds: [asin], itemIdType: 'ASIN' });
    const it = (g(got, 'itemsResult.items') || [])[0];
    if (!it) throw new HttpError(404, 'Amazon no devuelve ese producto (puede que no esté disponible en Amazon.es).');
    const p = normalize(it, tag);
    return { asin: p.asin, titulo: p.title, marca: p.brand, imagen: p.image, precio: p.price, precioAnterior: p.oldPrice, descuento: p.savings, caracteristicas: p.features };
  }
  throw new HttpError(404, 'Ruta desconocida.');
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra },
    });

    if (url.pathname.startsWith('/api/')) {
      try { return json(await api(request, env, url), 200, { 'Cache-Control': 'no-store' }); }
      catch (e) {
        if (!(e instanceof HttpError)) console.log('ERROR API', e.message);
        return json({ error: true, message: e instanceof HttpError ? e.message : 'Error inesperado: ' + e.message }, e.status || 500);
      }
    }

    const input = url.searchParams.get('u') || '';
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
