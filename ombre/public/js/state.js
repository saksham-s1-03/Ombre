// Single source of truth: catalogue + bag. Other modules listen with on().
const listeners = {};
export const on = (event, fn) => (listeners[event] ||= []).push(fn);
export const emit = (event, data) => (listeners[event] || []).forEach((fn) => fn(data));

function loadBag() {
  try {
    const raw = JSON.parse(localStorage.getItem('ombre.bag') || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch { return {}; }
}

export const state = { products: [], bag: loadBag() };
export const product = (id) => state.products.find((p) => p.id === id);

function saveBag() {
  try { localStorage.setItem('ombre.bag', JSON.stringify(state.bag)); } catch { /* private mode */ }
  emit('bag');
}

/** Keeps the bag honest when stock changes under it. */
function reconcile() {
  let changed = false;
  for (const [id, qty] of Object.entries(state.bag)) {
    const p = product(id);
    if (!p || p.stock <= 0) { delete state.bag[id]; changed = true; if (p) emit('clamped', { p, stock: 0 }); }
    else if (qty > p.stock) { state.bag[id] = p.stock; changed = true; emit('clamped', { p, stock: p.stock }); }
  }
  if (changed) saveBag();
}

export function setProducts(list) { state.products = list; reconcile(); emit('products'); emit('bag'); }

export function applyUpdate(u) {
  const p = product(u.id);
  if (!p) return;
  const dropped = u.stock < p.stock;
  p.stock = u.stock; p.price = u.price ?? p.price;
  reconcile();
  emit('product', { p, dropped });
  emit('bag');
}

export function addToBag(id, qty = 1) {
  const p = product(id);
  if (!p || p.stock <= 0) return { ok: false, reason: 'soldout' };
  const have = state.bag[id] || 0;
  if (have >= Math.min(p.stock, 10)) return { ok: false, reason: have >= 10 ? 'max' : 'stock', stock: p.stock };
  state.bag[id] = Math.min(have + qty, p.stock, 10);
  saveBag();
  return { ok: true };
}

export function setQty(id, qty) {
  const p = product(id);
  if (!p || qty <= 0) delete state.bag[id];
  else state.bag[id] = Math.min(qty, p.stock, 10);
  saveBag();
}

export const clearBag = () => { state.bag = {}; saveBag(); };

export function lines() {
  return Object.entries(state.bag).map(([id, qty]) => ({ p: product(id), qty })).filter((l) => l.p);
}

export const FREE_AT = 999;
export const FEE = 60;
export function totals() {
  const subtotal = lines().reduce((s, l) => s + l.p.price * l.qty, 0);
  const delivery = subtotal === 0 || subtotal >= FREE_AT ? 0 : FEE;
  return { subtotal, delivery, total: subtotal + delivery, count: lines().reduce((s, l) => s + l.qty, 0) };
}
