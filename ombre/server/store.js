import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { SEED_PRODUCTS, STATUSES, FREE_DELIVERY_AT, DELIVERY_FEE } from './seed.js';

const DIR = process.env.DATA_DIR || fileURLToPath(new URL('../data', import.meta.url));
const FILE = join(DIR, 'db.json');
let db;

function persist() {
  const tmp = FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, FILE); // atomic swap so a crash never leaves half a file
}

function load() {
  mkdirSync(DIR, { recursive: true });
  if (existsSync(FILE)) {
    try { db = JSON.parse(readFileSync(FILE, 'utf8')); }
    catch { console.error('data/db.json is unreadable. Starting from the seed catalogue.'); }
  }
  if (!db) db = { products: structuredClone(SEED_PRODUCTS), orders: [] };
  persist();
}
load();

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L to avoid mix-ups
function newOrderId() {
  const bytes = randomBytes(6);
  let id = 'OM-';
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length];
  return db.orders.some((o) => o.id === id) ? newOrderId() : id;
}

export const listProducts = () => db.products;
export const getProduct = (id) => db.products.find((p) => p.id === id);
export const getOrder = (id) => db.orders.find((o) => o.id === id);
export const listOrders = () => [...db.orders].reverse();
export const productUpdate = (p) => ({ id: p.id, stock: p.stock, price: p.price });

export function updateProduct(id, patch) {
  const p = getProduct(id);
  if (!p) return null;
  if (patch.stock !== undefined) p.stock = patch.stock;
  if (patch.price !== undefined) p.price = patch.price;
  persist();
  return p;
}

/** Creates an order and takes the stock in one synchronous step, so two buyers can never oversell. */
export function createOrder({ customer, items }) {
  const wanted = new Map();
  for (const it of items) wanted.set(it.id, (wanted.get(it.id) || 0) + it.qty);

  const lines = [];
  const short = {};
  for (const [id, qty] of wanted) {
    const p = getProduct(id);
    if (!p) return { error: 'One of the items is no longer on sale.', code: 400 };
    if (qty > p.stock) short[id] = p.stock;
    lines.push({ id, name: p.name, qty, price: p.price });
  }
  if (Object.keys(short).length) {
    return { error: 'Some items just sold out while you were checking out.', code: 409, short };
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const delivery = subtotal >= FREE_DELIVERY_AT ? 0 : DELIVERY_FEE;
  const now = new Date().toISOString();
  const order = {
    id: newOrderId(), createdAt: now, customer, items: lines,
    subtotal, delivery, total: subtotal + delivery,
    status: 'received', history: [{ status: 'received', at: now }]
  };
  const changed = [];
  for (const l of lines) { const p = getProduct(l.id); p.stock -= l.qty; changed.push(p); }
  db.orders.push(order);
  persist();
  return { order, changed };
}

export function setStatus(id, status) {
  const o = getOrder(id);
  if (!o) return { error: 'Order not found.', code: 404 };
  if (!STATUSES.includes(status)) return { error: 'Unknown status.', code: 400 };
  if (o.status === status) return { order: o, changed: [] };
  if (o.status === 'cancelled') return { error: 'A cancelled order cannot be changed.', code: 409 };
  if (status === 'cancelled' && o.status === 'delivered') return { error: 'A delivered order cannot be cancelled.', code: 409 };

  const changed = [];
  if (status === 'cancelled') { // put the chocolate back on the shelf
    for (const l of o.items) { const p = getProduct(l.id); if (p) { p.stock += l.qty; changed.push(p); } }
  }
  o.status = status;
  o.history.push({ status, at: new Date().toISOString() });
  persist();
  return { order: o, changed };
}
