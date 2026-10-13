import { $, $$, h, money, toast, fmtTime, timeAgo, STATUS_LABEL, FLOW } from './util.js';
import { api } from './api.js';

let token = sessionStorage.getItem('ombre.token');
let orders = [];
let products = [];
let tab = 'active';
let es = null;
let unseen = 0;

const auth = () => ({ Authorization: `Bearer ${token}` });
const call = (path, opts = {}) => api(path, { ...opts, headers: { ...auth(), ...(opts.headers || {}) } });

/* ---------- login ---------- */
function showLogin(msg = '') {
  token = null;
  sessionStorage.removeItem('ombre.token');
  es?.close();
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#loginError').textContent = msg;
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } });
    token = r.token;
    sessionStorage.setItem('ombre.token', token);
    $('#pw').value = '';
    await enter();
  } catch (err) { $('#loginError').textContent = err.message; }
});
$('#logout').addEventListener('click', () => showLogin());

/* ---------- orders ---------- */
const isActive = (o) => !['delivered', 'cancelled'].includes(o.status);

function orderCard(o, fresh = false) {
  const next = FLOW[FLOW.indexOf(o.status) + 1];
  const actions = [];
  if (next) actions.push(h('button', { class: 'btn btn-primary small', type: 'button', onClick: () => move(o.id, next) }, `Mark: ${STATUS_LABEL[next]}`));
  if (isActive(o)) actions.push(h('button', { class: 'btn btn-ghost-dark small', type: 'button', onClick: () => { if (confirm(`Cancel ${o.id}? The chocolate goes back on the shelf.`)) move(o.id, 'cancelled'); } }, 'Cancel order'));

  return h('li', { class: 'order' + (fresh ? ' fresh' : ''), 'data-id': o.id, 'data-status': o.status },
    h('div', { class: 'o-top' },
      h('span', { class: 'o-id' }, o.id),
      h('span', { class: 'o-time' }, `${fmtTime(o.createdAt)} (${timeAgo(o.createdAt)})`)
    ),
    h('p', { class: 'o-who' }, h('strong', {}, o.customer.name), o.customer.phone, h('br'), o.customer.address),
    h('ul', { class: 'o-items' }, o.items.map((i) => h('li', {}, `${i.qty} × ${i.name}`))),
    h('p', {}, h('span', { class: 'o-total' }, money(o.total)), ' on delivery. ', h('span', { class: 'pill' }, STATUS_LABEL[o.status])),
    h('div', { class: 'o-actions' }, actions)
  );
}

function renderOrders(freshId) {
  const list = orders.filter((o) => tab === 'all' || isActive(o));
  $('#orders').replaceChildren(...(list.length
    ? list.map((o) => orderCard(o, o.id === freshId))
    : [h('li', { class: 'empty' }, tab === 'active' ? 'No orders in progress. New ones will appear here the moment they are placed.' : 'No orders yet.')]));
  const n = orders.filter(isActive).length;
  $('#activeCount').textContent = n ? String(n) : '';
}

async function move(id, status) {
  try { await call(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } }); }
  catch (err) { toast(err.message, 'error'); }
}

$$('.tabs .chip').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  $$('.tabs .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderOrders();
}));

/* ---------- stock ---------- */
function renderStock() {
  $('#stockRows').replaceChildren(...products.map((p) => {
    const stock = h('input', { type: 'number', min: 0, max: 100000, value: p.stock, 'aria-label': `Stock for ${p.name}` });
    const price = h('input', { type: 'number', min: 1, max: 100000, value: p.price, 'aria-label': `Price for ${p.name}` });
    const save = h('button', { class: 'btn btn-ghost-dark small', type: 'button', onClick: async () => {
      try {
        await call(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { stock: Number(stock.value), price: Number(price.value) } });
        toast(`${p.name} saved.`);
      } catch (err) { toast(err.message, 'error'); }
    } }, 'Save');
    return h('tr', { 'data-id': p.id }, h('td', { class: 'pname' }, p.name), h('td', {}, stock), h('td', {}, price), h('td', {}, save));
  }));
}

function patchStockRow(u) {
  const p = products.find((x) => x.id === u.id);
  if (p) { p.stock = u.stock; p.price = u.price; }
  const row = $(`#stockRows tr[data-id="${u.id}"]`);
  if (!row) return;
  const [stock, price] = $$('input', row);
  if (document.activeElement !== stock) stock.value = u.stock; // don't overwrite while typing
  if (document.activeElement !== price) price.value = u.price;
  row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
}

/* ---------- live ---------- */
function connect() {
  es?.close();
  es = new EventSource(`/api/admin/stream?token=${encodeURIComponent(token)}`);
  const live = $('#liveState');
  es.addEventListener('open', () => { live.classList.add('on'); live.lastElementChild.textContent = 'Live'; });
  es.addEventListener('error', () => { live.classList.remove('on'); live.lastElementChild.textContent = 'Reconnecting'; });
  es.addEventListener('order:new', (e) => {
    const o = JSON.parse(e.data);
    orders.unshift(o);
    renderOrders(o.id);
    toast(`New order ${o.id} from ${o.customer.name}.`);
    if (document.hidden) { unseen++; document.title = `(${unseen}) New order | Ombré`; }
  });
  es.addEventListener('order:update', (e) => {
    const o = JSON.parse(e.data);
    const i = orders.findIndex((x) => x.id === o.id);
    if (i >= 0) orders[i] = o; else orders.unshift(o);
    renderOrders();
  });
  es.addEventListener('product', (e) => patchStockRow(JSON.parse(e.data)));
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { unseen = 0; document.title = 'Kitchen | Ombré'; } });

/* ---------- boot ---------- */
async function enter() {
  try {
    [orders, products] = await Promise.all([call('/api/admin/orders'), api('/api/products')]);
  } catch (err) {
    if (err.status === 401) return showLogin('Please log in again.');
    return showLogin(err.message);
  }
  $('#login').hidden = true;
  $('#app').hidden = false;
  renderOrders();
  renderStock();
  connect();
}

if (token) enter(); else showLogin();
