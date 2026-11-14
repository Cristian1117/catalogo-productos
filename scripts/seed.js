// Carga datos de demostración. Uso: npm run seed  (usa --force para borrar y recargar)
const fs = require('fs');
const path = require('path');
const { db, setSetting, uniqueSlug, DEFAULT_SETTINGS } = require('../db');

const force = process.argv.includes('--force');
const hasData = db.prepare('SELECT COUNT(*) c FROM products').get().c > 0;
if (hasData && !force) { console.log('Ya hay datos. Usa "npm run seed -- --force" para reiniciar.'); process.exit(0); }

db.exec('DELETE FROM products; DELETE FROM categories; DELETE FROM banners; DELETE FROM settings;');

const seedDir = path.join(__dirname, '..', 'public', 'seed');
fs.mkdirSync(seedDir, { recursive: true });

function productSvg(file, emoji, c1, c2, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<circle cx="640" cy="160" r="120" fill="#ffffff" opacity=".12"/><circle cx="140" cy="680" r="170" fill="#ffffff" opacity=".10"/>
<text x="400" y="440" font-size="300" text-anchor="middle" font-family="Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text>
<text x="400" y="640" font-size="44" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" opacity=".9">${label}</text>
</svg>`;
  fs.writeFileSync(path.join(seedDir, file), svg);
  return '/seed/' + file;
}
function bannerSvg(file, c1, c2, emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600" viewBox="0 0 1600 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="1600" height="600" fill="url(#g)"/>
<circle cx="1350" cy="120" r="260" fill="#fff" opacity=".10"/><circle cx="1100" cy="560" r="180" fill="#fff" opacity=".08"/>
<text x="1270" y="420" font-size="300" text-anchor="middle" font-family="Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text>
</svg>`;
  fs.writeFileSync(path.join(seedDir, file), svg);
  return '/seed/' + file;
}

for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setSetting(k, v);
setSetting('store_name', 'Tienda Nanis G');
if (fs.existsSync(path.join(seedDir, 'logo.jpg'))) setSetting('logo', '/seed/logo.jpg');
setSetting('tagline', 'Ropa, calzado y accesorios con envío a toda Colombia 🇨🇴');

const cats = ['Ropa', 'Calzado', 'Accesorios', 'Hogar'];
const catId = {};
cats.forEach((name, i) => {
  catId[name] = db.prepare('INSERT INTO categories(name,slug,sort_order,active) VALUES(?,?,?,1)').run(name, uniqueSlug(name), i + 1).lastInsertRowid;
});

const P = [
  ['Camiseta básica algodón', 'Camiseta 100% algodón, cuello redondo. Tallas S a XL.', 35000, 'Ropa', '👕', '#2563eb', '#7c3aed', 1, 24],
  ['Jean clásico azul', 'Jean tiro medio, corte recto, tela rígida de alta duración.', 89900, 'Ropa', '👖', '#1e3a8a', '#0ea5e9', 0, 3],
  ['Vestido floral', 'Vestido fresco ideal para clima cálido. Tallas S, M y L.', 120000, 'Ropa', '👗', '#db2777', '#f59e0b', 1, 0],
  ['Tenis urbanos', 'Tenis cómodos para el día a día, suela antideslizante.', 149900, 'Calzado', '👟', '#059669', '#14b8a6', 1, 8],
  ['Sandalias de cuero', 'Sandalias artesanales en cuero colombiano.', 75000, 'Calzado', '🩴', '#b45309', '#f97316', 0, 2],
  ['Gorra bordada', 'Gorra ajustable con bordado frontal.', 25000, 'Accesorios', '🧢', '#0f766e', '#22c55e', 0, 15],
  ['Gafas de sol', 'Protección UV400, marco liviano.', 45000, 'Accesorios', '🕶️', '#334155', '#64748b', 0, 0],
  ['Mochila escolar', 'Mochila resistente con compartimento para portátil de 15".', 99000, 'Accesorios', '🎒', '#7c2d12', '#ea580c', 1, 6],
  ['Taza de café', 'Taza de cerámica 350 ml, perfecta para el tinto de la mañana.', 18000, 'Hogar', '☕', '#78350f', '#a16207', 0, 40],
  ['Cojín decorativo', 'Cojín 45x45 cm con funda lavable.', 32000, 'Hogar', '🛋️', '#9333ea', '#ec4899', 0, 4],
];
const pid = [];
const ins = db.prepare('INSERT INTO products(name,description,price,category_id,image,active,featured,stock,low_stock) VALUES(?,?,?,?,?,1,?,?,5)');
P.forEach(([name, desc, price, cat, emoji, c1, c2, feat, stock], i) => {
  const img = productSvg(`producto-${i + 1}.svg`, emoji, c1, c2, cat.toUpperCase());
  pid.push(ins.run(name, desc, price, catId[cat], img, feat, stock).lastInsertRowid);
});

db.prepare('INSERT INTO banners(title,subtitle,image,link_type,link_value,sort_order,active) VALUES(?,?,?,?,?,?,1)')
  .run('¡Nueva colección!', 'Hasta 30% de descuento en ropa esta semana', bannerSvg('banner-1.svg', '#4f46e5', '#db2777', '🛍️'), 'category', String(catId['Ropa']), 1);
db.prepare('INSERT INTO banners(title,subtitle,image,link_type,link_value,sort_order,active) VALUES(?,?,?,?,?,?,1)')
  .run('Tenis urbanos', 'Comodidad para todo el día — pídelos ya por WhatsApp', bannerSvg('banner-2.svg', '#047857', '#0ea5e9', '👟'), 'product', String(pid[3]), 2);

console.log('Datos de demostración cargados ✔');
