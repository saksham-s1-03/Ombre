import { $, h, money, toast } from './util.js';
import { api } from './api.js';
import { state, on, lines, totals, setQty, clearBag, applyUpdate, FREE_AT } from './state.js';
import { artNode } from './shop.js';
import { start as startTracking } from './track.js';

let lastFocus = null;
let view = 'bag'; // 'bag' | 'done'
const PAGE_PARTS = ['header.nav', 'main', 'footer'];

function setPageInert(on) { PAGE_PARTS.forEach((s) => { const n = $(s); if (n) n.inert = on; }); }

export function openDrawer() {
  lastFocus = document.activeElement;
  $('#scrim').hidden = false;
  const d = $('#drawer');
  d.inert = false;
  setPageInert(true);
  requestAnimationFrame(() => { d.classList.add('open'); $('#drawerClose').focus(); });
  document.body.classList.add('locked');
}

export function closeDrawer() {
  const d = $('#drawer');
  d.classList.remove('open');
  d.inert = true;
  setPageInert(false);
  $('#scrim').hidden = true;
  document.body.classList.remove('locked');
  if (view === 'done') { view = 'bag'; renderAll(); }
  (lastFocus && document.contains(lastFocus) ? lastFocus : $('#bagBtn')).focus();
}

function lineRow({ p, qty }) {
  return h('li', { class: 'line' },
    artNode(p, 'line-art'),
    h('div', { class: 'line-info' },
      h('p', { class: 'line-name' }, p.name),
      h('p', { class: 'line-price' }, `${money(p.price)} each`),
      p.stock <= 5 ? h('p', { class: 'line-low' }, `Only ${p.stock} left`) : null
    ),
    h('div', { class: 'qty' },
      h('button', { type: 'button', 'aria-label': `Remove one ${p.name}`, onClick: () => setQty(p.id, qty - 1) }, '−'),
      h('output', { 'aria-label': `Quantity of ${p.name}` }, String(qty)),
      h('button', { type: 'button', 'aria-label': `Add one ${p.name}`, disabled: qty >= Math.min(p.stock, 10), onClick: () => setQty(p.id, qty + 1) }, '+')
    )
  );
}

function renderBag() {
  const ls = lines();
  const t = totals();
  const empty = ls.length === 0;
  $('#bagEmpty').hidden = !empty;
  $('#bagFull').hidden = empty;
  if (empty) return;

  $('#bagLines').replaceChildren(...ls.map(lineRow));
  const left = FREE_AT - t.subtotal;
  $('#freeMsg').textContent = left > 0 ? `Add ${money(left)} more for free delivery.` : 'You have free delivery.';
  $('#freeBar').style.width = `${Math.min(100, (t.subtotal / FREE_AT) * 100)}%`;
  $('#sumSub').textContent = money(t.subtotal);
  $('#sumDel').textContent = t.delivery ? money(t.delivery) : 'Free';
  $('#sumTotal').textContent = money(t.total);
}

function renderAll() {
  $('#viewBag').hidden = view !== 'bag';
  $('#viewDone').hidden = view !== 'done';
  renderBag();
}

function buildSkeleton() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ombre.customer') || '{}'); } catch { /* ignore */ }

  const field = (label, id, attrs) => h('label', { class: 'field', for: id }, label, h(attrs.tag || 'input', { id, name: id, required: true, ...attrs.props }));

  const form = h('form', { id: 'checkout', class: 'checkout', novalidate: true },
    h('h3', {}, 'Delivery details'),
    field('Full name', 'name', { props: { autocomplete: 'name', value: saved.name || '', maxlength: 60 } }),
    field('Phone number', 'phone', { props: { type: 'tel', autocomplete: 'tel', inputmode: 'tel', value: saved.phone || '', placeholder: '98765 43210', maxlength: 16 } }),
    field('Delivery address', 'address', { tag: 'textarea', props: { rows: 3, autocomplete: 'street-address', maxlength: 300 } }),
    h('p', { class: 'form-error', id: 'checkoutError', role: 'alert' }),
    h('button', { class: 'btn btn-primary place', type: 'submit', id: 'placeBtn' }, 'Place order'),
    h('p', { class: 'fine' }, 'Pay on delivery. No card needed.')
  );
  form.querySelector('#address').value = saved.address || '';
  form.addEventListener('submit', submit);

  $('#drawerBody').replaceChildren(
    h('div', { id: 'viewBag' },
      h('div', { id: 'bagEmpty', class: 'bag-empty' },
        h('p', { class: 'empty-title' }, 'Your bag is empty.'),
        h('p', {}, 'Pick a bar or a box from the collection and it will wait here.'),
        h('button', { class: 'btn btn-primary', type: 'button', onClick: () => { closeDrawer(); location.hash = '#collection'; } }, 'Browse the collection')
      ),
      h('div', { id: 'bagFull' },
        h('ul', { class: 'lines', id: 'bagLines' }),
        h('div', { class: 'free' }, h('p', { id: 'freeMsg' }), h('span', { class: 'free-track', 'aria-hidden': 'true' }, h('i', { id: 'freeBar' }))),
        h('dl', { class: 'sums' },
          h('div', {}, h('dt', {}, 'Subtotal'), h('dd', { id: 'sumSub' })),
          h('div', {}, h('dt', {}, 'Delivery'), h('dd', { id: 'sumDel' })),
          h('div', { class: 'grand' }, h('dt', {}, 'Total'), h('dd', { id: 'sumTotal' }))
        ),
        form
      )
    ),
    h('div', { id: 'viewDone', class: 'done', hidden: true })
  );
}

async function submit(e) {
  e.preventDefault();
  const err = $('#checkoutError');
  const btn = $('#placeBtn');
  err.textContent = '';
  const payload = {
    name: $('#name').value, phone: $('#phone').value, address: $('#address').value,
    items: lines().map((l) => ({ id: l.p.id, qty: l.qty }))
  };
  btn.disabled = true;
  btn.textContent = 'Placing your order…';
  try {
    const order = await api('/api/orders', { method: 'POST', body: payload });
    try { localStorage.setItem('ombre.customer', JSON.stringify({ name: payload.name, phone: payload.phone, address: payload.address })); } catch { /* ignore */ }
    clearBag();
    showDone(order);
    startTracking(order.id);
  } catch (ex) {
    err.textContent = ex.message;
    if (ex.status === 409 && ex.data?.stock) {
      for (const [id, stock] of Object.entries(ex.data.stock)) applyUpdate({ id, stock });
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place order';
  }
}

function showDone(order) {
  view = 'done';
  const copy = h('button', { class: 'link-btn', type: 'button', onClick: async () => {
    try { await navigator.clipboard.writeText(order.id); toast('Order ID copied.', 'ok', 1800); } catch { toast('Copy failed. Select the ID and copy it.', 'info'); }
  } }, 'Copy ID');
  $('#viewDone').replaceChildren(
    h('p', { class: 'done-kicker' }, 'Order placed'),
    h('h3', {}, 'Thank you. The kitchen has it.'),
    h('p', { class: 'done-id' }, order.id),
    copy,
    h('p', {}, `Total to pay on delivery: ${money(order.total)}. Keep this ID. Your tracker updates live as we make and pack your order.`),
    h('div', { class: 'done-actions' },
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => { closeDrawer(); $('#track').scrollIntoView({ behavior: 'smooth' }); } }, 'Watch it live'),
      h('button', { class: 'btn btn-ghost-dark', type: 'button', onClick: closeDrawer }, 'Keep shopping')
    )
  );
  renderAll();
}

export function initCart() {
  buildSkeleton();
  $('#bagBtn').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#drawer').classList.contains('open')) closeDrawer(); });
  on('bag', () => { renderBag(); $('#bagCount').textContent = String(totals().count); });
  on('products', renderAll);
  renderAll();
  $('#bagCount').textContent = String(totals().count);
}
