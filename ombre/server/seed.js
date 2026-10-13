// Starting catalogue. Edit freely: delete data/db.json to re-seed.
// stock = pieces on the shelf right now, capacity = size of the batch (drives the live meter).
export const SEED_PRODUCTS = [
  { id: 'ghana-72', name: 'Ghana Dark 72%', shape: 'bar', family: 'dark', cocoa: 72, price: 389, stock: 48, capacity: 60, featured: true,
    notes: 'Roasted hazelnut, dried cherry and a long, clean finish.',
    palette: { tile: '#f2c9cf', body: '#4a2018', accent: '#c4264f' } },
  { id: 'madagascar-85', name: 'Madagascar 85%', shape: 'bar', family: 'dark', cocoa: 85, price: 449, stock: 30, capacity: 40,
    notes: 'Red berries, citrus peel and very little sugar.',
    palette: { tile: '#d7e2b5', body: '#2f130e', accent: '#5d7230' } },
  { id: 'orange-64', name: 'Orange Zest 64%', shape: 'bar', family: 'dark', cocoa: 64, price: 369, stock: 36, capacity: 50,
    notes: 'Candied orange, warm spice and soft cocoa butter.',
    palette: { tile: '#f6d7a4', body: '#53281a', accent: '#d9731f' } },
  { id: 'pistachio-38', name: 'Salted Pistachio Milk', shape: 'bar', family: 'milk', cocoa: 38, price: 399, stock: 28, capacity: 45,
    notes: 'Toasted pistachio, sea salt and a malted milk body.',
    palette: { tile: '#dfe8c2', body: '#8a5a3a', accent: '#7e9a3d' } },
  { id: 'ruby-47', name: 'Ruby Raspberry', shape: 'bar', family: 'ruby', cocoa: 47, price: 429, stock: 22, capacity: 40,
    notes: 'Natural ruby cocoa with freeze-dried raspberry. Tart, then creamy.',
    palette: { tile: '#f9d5dc', body: '#c9606f', accent: '#e8365d' } },
  { id: 'truffles-classic', name: 'Classic Truffle Box, 12', shape: 'truffle', family: 'gift', price: 1199, stock: 18, capacity: 30,
    notes: 'Hand-rolled dark ganache dusted in cocoa. Keeps for three weeks.',
    palette: { tile: '#f4dcc8', body: '#3b1913', accent: '#b8893f' } },
  { id: 'hazelnut-praline', name: 'Hazelnut Praline Truffles, 9', shape: 'truffle', family: 'gift', price: 899, stock: 26, capacity: 40,
    notes: 'Crisp caramelised hazelnut inside a thin milk chocolate shell.',
    palette: { tile: '#e9d3c2', body: '#7a4527', accent: '#c4264f' } },
  { id: 'caramel-bonbons', name: 'Sea Salt Caramel Bonbons, 12', shape: 'bonbon', family: 'gift', price: 1049, stock: 20, capacity: 30,
    notes: 'Slow-cooked salted caramel in a snappy dark shell.',
    palette: { tile: '#f7e0b5', body: '#4a2018', accent: '#d9731f' } },
  { id: 'hot-chocolate', name: 'Hot Chocolate Ritual, 300 g', shape: 'jar', family: 'drink', price: 649, stock: 34, capacity: 50,
    notes: 'Shaved 70% chocolate. Whisk into hot milk, no powders.',
    palette: { tile: '#d7e2b5', body: '#4a2018', accent: '#5d7230' } }
];

export const STATUSES = ['received', 'crafting', 'packed', 'on_the_way', 'delivered', 'cancelled'];
export const FREE_DELIVERY_AT = 999;
export const DELIVERY_FEE = 60;
