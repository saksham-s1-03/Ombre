import { $, h, money, fmtTime, STATUS_LABEL, FLOW } from './util.js';
import { api } from './api.js';
import { watchOrder } from './live.js';

let currentId = null;
const box = () => $('#trackResult');

function render(order) {
  const done = new Map(order.history.map((x) => [x.status, x.at]));
  const idx = FLOW.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  const steps = FLOW.map((s, i) => {
    const state = cancelled ? (done.has(s) ? 'done' : 'off') : i < idx ? 'done' : i === idx ? 'now' : 'next';
    return h('li', { class: `step ${state}`, 'aria-current': state === 'now' ? 'step' : null },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('span', { class: 'step-name' }, STATUS_LABEL[s]),
      h('span', { class: 'step-time' }, done.has(s) ? fmtTime(done.get(s)) : '')
    );
  });

  box().replaceChildren(
    h('div', { class: 'track-head' },
      h('div', {}, h('p', { class: 'track-id' }, order.id), h('p', { class: 'track-sum' },
        order.items.map((i) => `${i.qty} × ${i.name}`).join(', '))),
      h('p', { class: 'track-total' }, money(order.total))
    ),
    cancelled ? h('p', { class: 'cancelled' }, 'This order was cancelled. If you did not expect this, call us and we will sort it out.') : null,
    h('ol', { class: 'stepper' }, steps),
    h('p', { class: 'track-live' }, h('i', { 'aria-hidden': 'true' }), 'Live. This page updates by itself.')
  );
}

export async function start(rawId, { scroll = false } = {}) {
  const id = String(rawId || '').trim().toUpperCase();
  const err = $('#trackError');
  err.textContent = '';
  if (!/^OM-[A-Z0-9]{6}$/.test(id)) { err.textContent = 'Order IDs look like OM-7K3QX9.'; return; }
  try {
    render(await api(`/api/orders/${id}`));
  } catch (e) {
    err.textContent = e.message;
    return;
  }
  $('#trackId').value = id;
  try { localStorage.setItem('ombre.lastOrder', id); } catch { /* private mode */ }

  currentId = id;
  watchOrder(id);
  if (scroll) $('#track').scrollIntoView({ behavior: 'smooth' });
}

export function applyStatus(order) { if (order.id === currentId) render(order); }

export function initTrack() {
  $('#trackForm').addEventListener('submit', (e) => { e.preventDefault(); start($('#trackId').value, { scroll: false }); });
  const fromHash = /^#track=(OM-[A-Z0-9]{6})$/i.exec(location.hash)?.[1];
  let saved = null;
  try { saved = localStorage.getItem('ombre.lastOrder'); } catch { /* ignore */ }
  const id = fromHash || saved;
  if (id) { $('#trackId').value = id; start(id); }
}
