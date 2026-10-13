/**
 * One EventSource per tab (browsers allow only 6 connections per site on HTTP/1.1).
 * Shop-wide events always arrive; status events arrive for the order being watched.
 */
let es = null;
let watching = null;
let handlers = null;

function open() {
  es?.close();
  es = new EventSource('/api/stream' + (watching ? `?order=${encodeURIComponent(watching)}` : ''));
  es.addEventListener('open', () => handlers?.onStatus(true));
  es.addEventListener('error', () => handlers?.onStatus(false));
  es.addEventListener('product', (e) => handlers?.onProduct(JSON.parse(e.data)));
  es.addEventListener('activity', (e) => handlers?.onActivity(JSON.parse(e.data)));
  es.addEventListener('status', (e) => handlers?.onOrder(JSON.parse(e.data)));
}

export function connectLive(h) { handlers = h; open(); }

export function watchOrder(id) {
  if (watching === id) return;
  watching = id;
  if (handlers) open(); // reconnect with the order attached
}
