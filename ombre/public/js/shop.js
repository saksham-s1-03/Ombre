import { $, h, money, toast } from './util.js';
import { state, on, addToBag } from './state.js';
import { artSvg } from './art.js';

const FILTERS = [
  { key: 'all', label: 'Everything', fam: null },
  { key: 'dark', label: 'Dark', fam: ['dark'] },
  { key: 'milk', label: 'Milk and ruby', fam: ['milk', 'ruby'] },
  { key: 'gift', label: 'Gift boxes', fam: ['gift'] },
  { key: 'drink', label: 'Drinking', fam: ['drink'] }
];
let active = 'all';

const stockText = (p) => (p.stock <= 0 ? 'Sold out' : p.stock <= 5 ? `Only ${p.stock} left` : `${p.stock} in stock`);

export function artNode(p, cls = 'tile-art') {
  const el = h('div', { class: cls });
  el.innerHTML = artSvg(p); // trusted catalogue data only
  el.style.setProperty('--tile', p.palette.tile);
  return el;
}

function tile(p) {
  const el = h('article', { class: 'tile' + (p.featured ? ' featured' : ''), 'data-id': p.id },
    artNode(p),
    h('div', { class: 'tile-body' },
      h('div', { class: 'tile-top' }, h('h3', {}, p.name), h('span', { class: 'price', 'data-price': '' }, money(p.price))),
      h('p', { class: 'tile-notes' }, p.notes),
      h('div', { class: 'stock-row' },
        h('span', { class: 'stock', 'data-stock': '' }),
        h('span', { class: 'meter', 'aria-hidden': 'true' }, h('i', { 'data-meter': '' }))
      ),
      h('button', { class: 'btn btn-primary add', type: 'button', 'data-add': '', onClick: () => add(p.id) }, 'Add to bag')
    )
  );
  paint(el, p);
  return el;
}

function paint(el, p) {
  const stock = el.querySelector('[data-stock]');
  stock.textContent = stockText(p);
  stock.classList.toggle('low', p.stock > 0 && p.stock <= 5);
  stock.classList.toggle('out', p.stock <= 0);
  el.querySelector('[data-meter]').style.width = `${Math.max(0, Math.min(100, (p.stock / p.capacity) * 100))}%`;
  el.querySelector('[data-price]').textContent = money(p.price);
  const btn = el.querySelector('[data-add]');
  btn.disabled = p.stock <= 0;
  btn.textContent = p.stock <= 0 ? 'Sold out' : 'Add to bag';
  el.classList.toggle('is-out', p.stock <= 0);
}

export function add(id) {
  const r = addToBag(id);
  const p = state.products.find((x) => x.id === id);
  if (r.ok) toast(`${p.name} is in your bag.`, 'ok', 2200);
  else if (r.reason === 'soldout') toast(`${p.name} just sold out.`, 'error');
  else if (r.reason === 'max') toast('You can order up to 10 of each item.', 'info');
  else toast(`Only ${r.stock} of ${p.name} left, and they're all in your bag.`, 'info');
}

function renderGrid() {
  const f = FILTERS.find((x) => x.key === active);
  const list = state.products.filter((p) => !f.fam || f.fam.includes(p.family));
  $('#grid').replaceChildren(...list.map(tile));
}

function renderFilters() {
  $('#filters').replaceChildren(...FILTERS.map((f) =>
    h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(f.key === active),
      onClick: () => { active = f.key; renderFilters(); renderGrid(); }
    }, f.label)
  ));
}

export function initShop() {
  renderFilters();
  on('products', renderGrid);
  on('product', ({ p, dropped }) => {
    const el = $(`.tile[data-id="${p.id}"]`);
    if (!el) return;
    paint(el, p);
    const stock = el.querySelector('[data-stock]');
    stock.classList.remove('flash');
    void stock.offsetWidth; // restart the animation
    stock.classList.add('flash');
    stock.dataset.dir = dropped ? 'down' : 'up';
  });
}
