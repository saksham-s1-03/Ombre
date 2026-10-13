import * as store from './store.js';
import * as hub from './hub.js';
import { checkPassword, issueToken, verifyToken } from './auth.js';
import { STATUSES } from './seed.js';

/* ---------- helpers ---------- */
const MAX_BODY = 20 * 1024;

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
const fail = (res, code, error, extra = {}) => json(res, code, { error, ...extra });

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Request is too large.'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 600000)) hits.delete(k); }, 60000).unref();

const clientIp = (req) =>
  (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';

const isAdmin = (req, url) => {
  const header = req.headers.authorization || '';
  return verifyToken(header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token'));
};

const publicOrder = (o) => ({
  id: o.id, status: o.status, history: o.history, createdAt: o.createdAt,
  items: o.items.map(({ name, qty }) => ({ name, qty })), total: o.total
});

/* ---------- validation ---------- */
function cleanText(v, min, max) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s.length >= min && s.length <= max ? s : null;
}

function validateOrder(b) {
  const name = cleanText(b.name, 2, 60);
  const address = cleanText(b.address, 10, 300);
  const phone = typeof b.phone === 'string' ? b.phone.replace(/[\s()-]/g, '') : '';
  if (!name) return 'Enter your name (2 to 60 characters).';
  if (!/^\+?\d{10,13}$/.test(phone)) return 'Enter a valid phone number with 10 to 13 digits.';
  if (!address) return 'Enter a full delivery address (at least 10 characters).';
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 20) return 'Your bag is empty.';
  const items = [];
  for (const it of b.items) {
    if (!it || typeof it.id !== 'string' || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 10) {
      return 'Each item needs a quantity from 1 to 10.';
    }
    items.push({ id: it.id, qty: it.qty });
  }
  return { customer: { name, phone, address }, items };
}

/* ---------- router ---------- */
export async function handleApi(req, res, url) {
  const path = url.pathname;
  const method = req.method;
  let m;

  try {
    if (method === 'GET' && path === '/api/health') return json(res, 200, { ok: true, ...hub.clientCount() });

    if (method === 'GET' && path === '/api/products') return json(res, 200, store.listProducts());

    if (method === 'GET' && path === '/api/stream') {
      const wanted = url.searchParams.get('order');
      const order = wanted && /^OM-[A-Z0-9]{6}$/.test(wanted) ? store.getOrder(wanted) : null;
      return hub.openPublic(req, res, order?.id, order ? publicOrder(order) : undefined);
    }

    if (method === 'POST' && path === '/api/orders') {
      if (limited('order:' + clientIp(req), Number(process.env.ORDER_LIMIT) || 6, 10 * 60 * 1000)) return fail(res, 429, 'Too many orders from this device. Please try again in a few minutes.');
      const parsed = validateOrder(await readJson(req));
      if (typeof parsed === 'string') return fail(res, 400, parsed);

      const result = store.createOrder(parsed);
      if (result.error) return fail(res, result.code, result.error, { stock: result.short });

      const { order, changed } = result;
      for (const p of changed) hub.toPublic('product', store.productUpdate(p));
      const first = order.items[0];
      const more = order.items.length > 1 ? ` and ${order.items.length - 1} more` : '';
      hub.toPublic('activity', { text: `Someone just ordered ${first.qty} × ${first.name}${more}.` });
      hub.toAdmin('order:new', order);
      return json(res, 201, publicOrder(order));
    }

    if ((m = path.match(/^\/api\/orders\/(OM-[A-Z0-9]{6})$/)) && method === 'GET') {
      const order = store.getOrder(m[1]);
      if (!order) return fail(res, 404, 'We could not find that order. Check the ID and try again.');
      return json(res, 200, publicOrder(order));
    }

    /* ----- admin ----- */
    if (method === 'POST' && path === '/api/admin/login') {
      if (limited('login:' + clientIp(req), 10, 10 * 60 * 1000)) return fail(res, 429, 'Too many attempts. Try again later.');
      const body = await readJson(req);
      if (!checkPassword(body.password ?? '')) return fail(res, 401, 'Wrong password.');
      return json(res, 200, { token: issueToken() });
    }

    if (path.startsWith('/api/admin/')) {
      if (!isAdmin(req, url)) return fail(res, 401, 'Please log in again.');

      if (method === 'GET' && path === '/api/admin/stream') return hub.openAdmin(req, res);
      if (method === 'GET' && path === '/api/admin/orders') return json(res, 200, store.listOrders());

      if ((m = path.match(/^\/api\/admin\/orders\/(OM-[A-Z0-9]{6})$/)) && method === 'PATCH') {
        const { status } = await readJson(req);
        if (!STATUSES.includes(status)) return fail(res, 400, 'Unknown status.');
        const result = store.setStatus(m[1], status);
        if (result.error) return fail(res, result.code, result.error);
        hub.toTrackers(result.order.id, 'status', publicOrder(result.order));
        hub.toAdmin('order:update', result.order);
        for (const p of result.changed) hub.toPublic('product', store.productUpdate(p));
        return json(res, 200, result.order);
      }

      if ((m = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/)) && method === 'PATCH') {
        const b = await readJson(req);
        const patch = {};
        if (b.stock !== undefined) {
          if (!Number.isInteger(b.stock) || b.stock < 0 || b.stock > 100000) return fail(res, 400, 'Stock must be a whole number from 0 to 100000.');
          patch.stock = b.stock;
        }
        if (b.price !== undefined) {
          if (!Number.isInteger(b.price) || b.price < 1 || b.price > 100000) return fail(res, 400, 'Price must be a whole number of rupees.');
          patch.price = b.price;
        }
        const p = store.updateProduct(m[1], patch);
        if (!p) return fail(res, 404, 'Product not found.');
        hub.toPublic('product', store.productUpdate(p));
        hub.toAdmin('product', store.productUpdate(p));
        return json(res, 200, p);
      }
    }

    return fail(res, 404, 'Not found.');
  } catch (err) {
    if (err.code === 413 || err.code === 400) return fail(res, err.code, err.message);
    console.error(err);
    return fail(res, 500, 'Something went wrong on our side. Please try again.');
  }
}
