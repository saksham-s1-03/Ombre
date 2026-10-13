# Ombré: a chocolate brand storefront with live stock and live order tracking

A complete small-batch chocolate shop: a premium storefront, a cart and checkout, a live order tracker for
customers, and a kitchen dashboard where orders arrive in real time. Plain HTML, CSS and JavaScript on the front,
Node.js on the back, **zero npm dependencies**, nothing to install.

## What is real-time here

| Where | What updates instantly |
|---|---|
| Storefront | "46 in stock" counters and the stock meter change the moment anyone orders. The "Someone just ordered…" line appears for every visitor. |
| Your bag | If stock drops below your quantity, your bag adjusts itself and tells you. |
| Order tracker | When the kitchen moves your order to the next step, your tracker changes with no refresh. |
| Kitchen dashboard | New orders pop in, status changes sync across staff devices, and stock edits appear on the shop. |

It uses **Server-Sent Events** (plain HTTP, built into every browser, reconnects by itself). The server sends
`product`, `activity`, `status` and `order:new` events from `server/hub.js`. When the connection drops, the page shows
"Reconnecting" and refreshes the catalogue once it is back.

## Quick start

Requires Node.js 20 or newer. Nothing else.

    npm start
    # Shop:     http://localhost:3000
    # Kitchen:  http://localhost:3000/admin     (default password: admin123)

To see the real-time features, open the shop in two browser windows and the kitchen dashboard in a third. Place an
order in one window and watch the other two react. Then click "Mark: Being made fresh" in the kitchen and watch the
customer's tracker move.

Run the tests (they cover ordering, overselling, live events, tracking and admin security):

    npm test

## Project structure

    server/
      server.js    entry point
      app.js       HTTP server, static files, security headers
      routes.js    REST API, validation, rate limits
      store.js     JSON-file database (data/db.json), stock-safe order creation
      hub.js       Server-Sent Events broadcasting
      auth.js      admin login and signed tokens
      seed.js      the product catalogue (edit this to change what you sell)
    public/
      index.html, admin.html
      css/         tokens.css (design tokens), site.css, admin.css
      js/          main, state, shop, match, cart, track, live, hero, art, api, util, admin
    test/api.test.js

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/products | Catalogue with live stock |
| GET | /api/stream | Live event stream. Add `?order=OM-XXXXXX` to also get that order's status changes |
| POST | /api/orders | Place an order: `{name, phone, address, items:[{id, qty}]}` |
| GET | /api/orders/:id | Public order status (no personal data) |
| POST | /api/admin/login | `{password}` returns a token |
| GET | /api/admin/orders | All orders (token required) |
| PATCH | /api/admin/orders/:id | `{status}`: received, crafting, packed, on_the_way, delivered, cancelled |
| PATCH | /api/admin/products/:id | `{stock, price}` |
| GET | /api/admin/stream?token= | Kitchen live stream |

## Configuration

Copy `.env.example` for the full list. The important ones:

- `ADMIN_PASSWORD`: required when `NODE_ENV=production`. The server refuses to start without it.
- `DATA_DIR`: where `db.json` lives. Put this on a persistent disk when you deploy.
- `PORT`: defaults to 3000.

## Security notes

- Prices and totals are always calculated on the server. The browser cannot set its own price.
- Stock is taken and the order is created in one synchronous step, so two buyers can never oversell the last bar.
- Strict Content-Security-Policy, input validation, a 20 KB body limit, rate limits on orders and logins, and path
  traversal protection on static files.
- Order IDs are random (31^6 combinations). The public tracker never exposes names, phones or addresses.
- Checkout is **pay on delivery**. There is no payment gateway, so no card data is handled.

## Deploy

**Docker (any host):**

    docker build -t ombre .
    docker run -p 3000:3000 -e ADMIN_PASSWORD=your-password -v ombre-data:/app/data ombre

**Render / Railway:** create a Web Service from this repo. Build command: none. Start command: `npm start`. Set
`ADMIN_PASSWORD`, `NODE_ENV=production`, `TRUST_PROXY=1`, and attach a persistent disk mounted at the path you set in
`DATA_DIR`. Without a persistent disk, free tiers erase `data/db.json` on every restart, so orders would be lost.

**Good to know:** browsers allow only 6 live connections per site over HTTP/1.1, and each open tab uses one. Hosts like
Render, Railway and Cloudflare serve HTTP/2, which removes that limit.

## Ideas to extend

1. Replace `store.js` with PostgreSQL (the functions are small and isolated).
2. Add online payments (Razorpay or Stripe) and mark orders paid by webhook.
3. Send an SMS or WhatsApp message when an order's status changes.
4. Add product photos and an `<img>` option in `art.js`.
5. Add customer accounts and order history.

## License

# PROPRIETARY SOFTWARE LICENSE
