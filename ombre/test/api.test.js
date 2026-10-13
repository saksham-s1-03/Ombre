import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'ombre-'));
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.ORDER_LIMIT = '1000';

let server, base;
before(async () => {
  const { createApp } = await import('../server/app.js');
  server = createApp();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeStreams(); server.close(); rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const customer = { name: 'Asha Verma', phone: '9876543210', address: '12 Rose Lane, Indore, Madhya Pradesh' };

/** Opens an SSE stream and collects events until closed. */
async function listen(path) {
  const ctrl = new AbortController();
  const res = await fetch(base + path, { signal: ctrl.signal });
  const events = [];
  (async () => {
    const dec = new TextDecoder();
    let buf = '';
    try {
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /event: (.+)/.exec(block)?.[1]; const data = /data: (.+)/.exec(block)?.[1];
          if (ev && data) events.push({ event: ev, data: JSON.parse(data) });
        }
      }
    } catch { /* aborted */ }
  })();
  const waitFor = async (name, ms = 2000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const e = events.find((x) => x.event === name); if (e) return e; await new Promise((r) => setTimeout(r, 20)); }
    throw new Error('Timed out waiting for event: ' + name);
  };
  return { events, waitFor, close: () => ctrl.abort() };
}

test('serves the storefront and the catalogue', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/admin')).status, 200);
  const products = await (await fetch(base + '/api/products')).json();
  assert.ok(products.length >= 9);
});

test('blocks path traversal', async () => {
  const res = await fetch(base + '/..%2f..%2fetc/passwd');
  assert.ok([403, 404].includes(res.status));
});

test('validates orders', async () => {
  assert.equal((await post('/api/orders', { ...customer, items: [] })).status, 400);
  assert.equal((await post('/api/orders', { ...customer, phone: 'abc', items: [{ id: 'ghana-72', qty: 1 }] })).status, 400);
  assert.equal((await post('/api/orders', { ...customer, items: [{ id: 'ghana-72', qty: 0 }] })).status, 400);
});

test('an order takes stock and pushes live events to shoppers, trackers and the kitchen', async () => {
  const shopper = await listen('/api/stream');
  await shopper.waitFor('hello');
  const login = await (await post('/api/admin/login', { password: 'test-pass' })).json();
  const kitchen = await listen('/api/admin/stream?token=' + login.token);
  await kitchen.waitFor('hello');

  const before = (await (await fetch(base + '/api/products')).json()).find((p) => p.id === 'ghana-72').stock;
  const res = await post('/api/orders', { ...customer, items: [{ id: 'ghana-72', qty: 2 }, { id: 'hot-chocolate', qty: 1 }] });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.match(order.id, /^OM-[A-Z0-9]{6}$/);
  assert.equal(order.total, 389 * 2 + 649); // over 999, so free delivery
  assert.equal(order.customer, undefined, 'public order must not leak personal data');

  const stockEvent = await shopper.waitFor('product');
  assert.equal(stockEvent.data.id, 'ghana-72');
  assert.equal(stockEvent.data.stock, before - 2);
  assert.match((await shopper.waitFor('activity')).data.text, /Someone just ordered/);
  assert.equal((await kitchen.waitFor('order:new')).data.customer.name, 'Asha Verma');

  // live tracking
  const tracker = await listen(`/api/stream?order=${order.id}`);
  assert.equal((await tracker.waitFor('hello')).data.status, 'received');
  const patch = await fetch(`${base}/api/admin/orders/${order.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token }, body: JSON.stringify({ status: 'packed' })
  });
  assert.equal(patch.status, 200);
  assert.equal((await tracker.waitFor('status')).data.status, 'packed');

  // cancelling returns the stock to the shelf
  await fetch(`${base}/api/admin/orders/${order.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token }, body: JSON.stringify({ status: 'cancelled' })
  });
  const after = (await (await fetch(base + '/api/products')).json()).find((p) => p.id === 'ghana-72').stock;
  assert.equal(after, before);

  [shopper, kitchen, tracker].forEach((s) => s.close());
});

test('never oversells', async () => {
  const id = 'madagascar-85';
  const stock = (await (await fetch(base + '/api/products')).json()).find((x) => x.id === id).stock; // 30
  for (let left = stock; left > 0; left -= 10) {
    assert.equal((await post('/api/orders', { ...customer, items: [{ id, qty: Math.min(10, left) }] })).status, 201);
  }
  const over = await post('/api/orders', { ...customer, items: [{ id, qty: 1 }] });
  assert.equal(over.status, 409);
  assert.equal((await over.json()).stock[id], 0);
});

test('admin routes need a valid token', async () => {
  assert.equal((await fetch(base + '/api/admin/orders')).status, 401);
  assert.equal((await post('/api/admin/login', { password: 'nope' })).status, 401);
  const { token } = await (await post('/api/admin/login', { password: 'test-pass' })).json();
  const ok = await fetch(base + '/api/admin/orders', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(ok.status, 200);
  assert.equal((await fetch(base + '/api/admin/orders', { headers: { Authorization: 'Bearer ' + token.slice(0, -2) + 'xx' } })).status, 401);
});
