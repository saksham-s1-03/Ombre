import { $, toast } from './util.js';
import { api } from './api.js';
import { state, on, setProducts, applyUpdate } from './state.js';
import { connectLive } from './live.js';
import { initHero } from './hero.js';
import { initShop } from './shop.js';
import { initMatch } from './match.js';
import { initCart } from './cart.js';
import { initTrack, applyStatus } from './track.js';

const live = $('#liveState');
let wasDown = false;
let pulseTimer;

function setLive(ok) {
  live.classList.toggle('on', ok);
  live.lastElementChild.textContent = ok ? 'Live' : 'Reconnecting';
}

function shelfSummary() {
  const total = state.products.reduce((s, p) => s + p.stock, 0);
  const low = state.products.filter((p) => p.stock > 0 && p.stock <= 5);
  const out = state.products.filter((p) => p.stock <= 0);
  let text = `${total} pieces on the shelf across ${state.products.length} products.`;
  if (low.length) text += ` Running low: ${low.map((p) => p.name).join(', ')}.`;
  if (out.length) text += ` Sold out: ${out.map((p) => p.name).join(', ')}.`;
  return text;
}
const showShelf = () => { $('#pulseText').textContent = shelfSummary(); };

function showActivity(text) {
  $('#pulseText').textContent = text;
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => { pulseTimer = null; showShelf(); }, 9000);
}

async function loadProducts() {
  try {
    setProducts(await api('/api/products'));
    showShelf();
  } catch {
    $('#grid').textContent = 'We could not load the shop. Please refresh in a moment.';
  }
}

async function boot() {
  initHero();
  initShop();
  initMatch();
  initCart();
  on('clamped', ({ p, stock }) =>
    toast(stock === 0 ? `${p.name} sold out, so we removed it from your bag.` : `Only ${stock} of ${p.name} left, so we updated your bag.`, 'info'));
  on('bag', () => {
    const b = $('#bagBtn');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  });

  await loadProducts();
  initTrack();

  connectLive({
    onProduct: (u) => { applyUpdate(u); if (!pulseTimer) showShelf(); },
    onActivity: (a) => showActivity(a.text),
    onOrder: applyStatus,
    onStatus: (ok) => {
      setLive(ok);
      if (ok && wasDown) loadProducts(); // catch up on anything missed while offline
      if (!ok) wasDown = true;
    }
  });
}

boot();
