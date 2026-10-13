// Server-Sent Events hub. SSE is plain HTTP, works through proxies and reconnects by itself.
const publicClients = new Set();
const adminClients = new Set();
const trackers = new Map(); // orderId -> Set<res>
const MAX_CLIENTS = 2000;

function init(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
}

export function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function attach(req, res, sets, hello) {
  if (publicClients.size + adminClients.size >= MAX_CLIENTS) { res.writeHead(503); res.end(); return; }
  init(res);
  for (const set of sets) set.add(res);
  send(res, 'hello', hello || {});
  req.on('close', () => {
    for (const set of sets) set.delete(res);
    for (const [id, set] of trackers) if (set.size === 0) trackers.delete(id);
  });
}

export const openAdmin = (req, res) => attach(req, res, [adminClients]);

/** One stream per browser tab: shop-wide events, plus status changes for one order when given. */
export function openPublic(req, res, orderId, snapshot) {
  const sets = [publicClients];
  if (orderId) {
    if (!trackers.has(orderId)) trackers.set(orderId, new Set());
    sets.push(trackers.get(orderId));
  }
  attach(req, res, sets, snapshot);
}

const fan = (set, event, data) => { for (const res of set) send(res, event, data); };
export const toPublic = (event, data) => fan(publicClients, event, data);
export const toAdmin = (event, data) => fan(adminClients, event, data);
export const toTrackers = (orderId, event, data) => { const s = trackers.get(orderId); if (s) fan(s, event, data); };

export const clientCount = () => ({ public: publicClients.size, admin: adminClients.size });

// A comment line every 20 s keeps idle connections from being closed by proxies.
const beat = setInterval(() => {
  for (const set of [publicClients, adminClients, ...trackers.values()]) for (const res of set) res.write(': ping\n\n');
}, 20000);
beat.unref();

export function closeAll() {
  for (const set of [publicClients, adminClients, ...trackers.values()]) for (const res of set) res.end();
}
