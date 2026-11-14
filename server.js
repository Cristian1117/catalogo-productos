require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const cookieSession = require('cookie-session');
const { db, getSettings, setSetting, uniqueSlug } = require('./db');
const { storePage } = require('./views/store');
const A = require('./views/admin');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error('Falta ADMIN_PASSWORD en el archivo .env'); process.exit(1); }
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Si la base está vacía, cargar datos de demostración
if (db.prepare('SELECT COUNT(*) c FROM settings').get().c === 0) require('./scripts/seed');

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(cookieSession({
  name: 'cat_sess',
  secret: process.env.SESSION_SECRET || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex'),
  maxAge: 7 * 24 * 3600 * 1000, sameSite: 'strict', httpOnly: true,
}));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype] || '';
      cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)),
});
function removeUpload(p) {
  if (p && p.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(p)), () => {});
}

const baseUrl = (req) => (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const int = (v, d = 0) => { const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : d; };
const PRODUCT_SQL = `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

// ---------- Tienda pública ----------
app.get('/', (req, res) => {
  const s = getSettings();
  const banners = db.prepare('SELECT * FROM banners WHERE active=1 ORDER BY sort_order, id').all();
  const categories = db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY sort_order, name').all();
  const products = db.prepare(`${PRODUCT_SQL} WHERE p.active=1 AND (p.category_id IS NULL OR c.active=1) ORDER BY (p.stock<=0), p.featured DESC, p.name`).all();
  res.send(storePage({ s, banners, categories, products, baseUrl: baseUrl(req) }));
});
app.get('/p/:id', (req, res) => res.redirect(`/#producto-${int(req.params.id)}`));
app.get('/salud', (req, res) => res.json({ ok: true }));

// ---------- Autenticación ----------
const attempts = new Map();
function checkPassword(pw) {
  const a = crypto.createHash('sha256').update(String(pw || '')).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
app.get('/admin/login', (req, res) => res.send(A.loginPage('', getSettings())));
app.post('/admin/login', (req, res) => {
  const ip = req.ip; const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 15 * 60 * 1000) { rec.n = 0; rec.t = now; }
  if (rec.n >= 10) return res.status(429).send(A.loginPage('Demasiados intentos. Espera 15 minutos.', getSettings()));
  if (checkPassword(req.body.password)) { attempts.delete(ip); req.session.admin = true; return res.redirect('/admin'); }
  rec.n++; attempts.set(ip, rec);
  res.status(401).send(A.loginPage('Contraseña incorrecta', getSettings()));
});
app.post('/admin/logout', (req, res) => { req.session = null; res.redirect('/admin/login'); });

const admin = express.Router();
admin.use((req, res, next) => { if (!req.session.admin) return res.redirect('/admin/login'); next(); });
function render(req, res, title, active, body) {
  const flash = req.session.flash; req.session.flash = null;
  res.send(A.layout({ title, active, body, flash, s: getSettings() }));
}
const flash = (req, msg, type = 'ok') => { req.session.flash = { msg, type }; };
const safeBack = (b, d) => (typeof b === 'string' && b.startsWith('/admin') ? b : d);

admin.get('/', (req, res) => {
  const counts = {
    products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
    categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    banners: db.prepare('SELECT COUNT(*) c FROM banners WHERE active=1').get().c,
    low: db.prepare('SELECT COUNT(*) c FROM products WHERE stock>0 AND stock<=low_stock').get().c,
    out: db.prepare('SELECT COUNT(*) c FROM products WHERE stock<=0').get().c,
  };
  const lowList = db.prepare(`${PRODUCT_SQL} WHERE p.stock<=p.low_stock ORDER BY p.stock, p.name`).all();
  render(req, res, 'Resumen', '/admin', A.dashboard({ counts, lowList, s: getSettings() }));
});

// Productos
admin.get('/productos', (req, res) => {
  const { q = '', stock: filter = '', cat = '' } = req.query;
  const where = []; const params = [];
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (cat) { where.push('p.category_id = ?'); params.push(int(cat)); }
  if (filter === 'bajo') where.push('p.stock>0 AND p.stock<=p.low_stock');
  if (filter === 'agotado') where.push('p.stock<=0');
  if (filter === 'alerta') where.push('p.stock<=p.low_stock');
  const products = db.prepare(`${PRODUCT_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.sort_order, p.name`).all(...params);
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  render(req, res, 'Productos', '/admin/productos', A.productList({ products, categories, q, filter, cat }));
});
admin.get('/productos/nuevo', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  render(req, res, 'Nuevo producto', '/admin/productos', A.productForm({ p: {}, categories, s: getSettings() }));
});
function productData(req) {
  const b = req.body;
  return {
    name: String(b.name || '').trim(), description: String(b.description || '').trim(), price: Math.max(0, int(b.price)),
    category_id: b.category_id ? int(b.category_id) : null, active: b.active ? 1 : 0, featured: b.featured ? 1 : 0,
    stock: Math.max(0, int(b.stock)), low_stock: Math.max(0, int(b.low_stock, int(getSettings().default_low_stock, 5))),
  };
}
admin.post('/productos/nuevo', upload.single('image'), (req, res) => {
  const d = productData(req);
  if (!d.name) { flash(req, 'El nombre es obligatorio', 'error'); return res.redirect('/admin/productos/nuevo'); }
  d.image = req.file ? `/uploads/${req.file.filename}` : '';
  db.prepare(`INSERT INTO products(name,description,price,category_id,image,active,featured,stock,low_stock)
    VALUES(@name,@description,@price,@category_id,@image,@active,@featured,@stock,@low_stock)`).run(d);
  flash(req, `Producto “${d.name}” creado`); res.redirect('/admin/productos');
});
admin.get('/productos/:id/editar', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(int(req.params.id));
  if (!p) return res.redirect('/admin/productos');
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  render(req, res, `Editar: ${p.name}`, '/admin/productos', A.productForm({ p, categories, s: getSettings() }));
});
admin.post('/productos/:id/editar', upload.single('image'), (req, res) => {
  const id = int(req.params.id);
  const old = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (!old) return res.redirect('/admin/productos');
  const d = { ...productData(req), id, image: old.image };
  if (req.file) { removeUpload(old.image); d.image = `/uploads/${req.file.filename}`; }
  db.prepare(`UPDATE products SET name=@name,description=@description,price=@price,category_id=@category_id,image=@image,
    active=@active,featured=@featured,stock=@stock,low_stock=@low_stock WHERE id=@id`).run(d);
  flash(req, 'Producto actualizado'); res.redirect('/admin/productos');
});
admin.post('/productos/:id/stock', (req, res) => {
  const id = int(req.params.id);
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (p) {
    const next = req.body.delta ? p.stock + int(req.body.delta) : int(req.body.set, p.stock);
    db.prepare('UPDATE products SET stock=? WHERE id=?').run(Math.max(0, next), id);
    flash(req, `Stock de “${p.name}”: ${Math.max(0, next)} unidad(es)`);
  }
  res.redirect(safeBack(req.body.back, '/admin/productos'));
});
admin.post('/productos/:id/eliminar', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(int(req.params.id));
  if (p) { db.prepare('DELETE FROM products WHERE id=?').run(p.id); removeUpload(p.image); flash(req, 'Producto eliminado'); }
  res.redirect('/admin/productos');
});

// Categorías
admin.get('/categorias', (req, res) => {
  const categories = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) count FROM categories c ORDER BY sort_order, name').all();
  render(req, res, 'Categorías', '/admin/categorias', A.categoriesPage({ categories }));
});
admin.post('/categorias', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name) { db.prepare('INSERT INTO categories(name,slug,sort_order,active) VALUES(?,?,?,1)').run(name, uniqueSlug(name), int(req.body.sort_order)); flash(req, `Categoría “${name}” creada`); }
  res.redirect('/admin/categorias');
});
admin.post('/categorias/:id', (req, res) => {
  const id = int(req.params.id); const name = String(req.body.name || '').trim();
  if (name) { db.prepare('UPDATE categories SET name=?, slug=?, sort_order=?, active=? WHERE id=?').run(name, uniqueSlug(name, id), int(req.body.sort_order), req.body.active ? 1 : 0, id); flash(req, 'Categoría actualizada'); }
  res.redirect('/admin/categorias');
});
admin.post('/categorias/:id/eliminar', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(int(req.params.id)); flash(req, 'Categoría eliminada'); res.redirect('/admin/categorias');
});

// Banners
admin.get('/banners', (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order, id').all();
  const products = db.prepare('SELECT id, name FROM products ORDER BY name').all();
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY sort_order, name').all();
  render(req, res, 'Banners', '/admin/banners', A.bannersPage({ banners, products, categories }));
});
function bannerData(req) {
  const b = req.body; const t = ['none', 'category', 'product', 'url'].includes(b.link_type) ? b.link_type : 'none';
  const v = t === 'category' ? b.link_category : t === 'product' ? b.link_product : t === 'url' ? b.link_url : '';
  return { title: String(b.title || '').trim(), subtitle: String(b.subtitle || '').trim(), link_type: t, link_value: String(v || '').trim(), sort_order: int(b.sort_order), active: b.active ? 1 : 0 };
}
admin.post('/banners', upload.single('image'), (req, res) => {
  if (!req.file) { flash(req, 'Sube una imagen (JPG, PNG, WEBP o GIF) para el banner', 'error'); return res.redirect('/admin/banners'); }
  const d = { ...bannerData(req), image: `/uploads/${req.file.filename}` };
  db.prepare('INSERT INTO banners(title,subtitle,image,link_type,link_value,sort_order,active) VALUES(@title,@subtitle,@image,@link_type,@link_value,@sort_order,@active)').run(d);
  flash(req, 'Banner creado'); res.redirect('/admin/banners');
});
admin.post('/banners/:id', upload.single('image'), (req, res) => {
  const id = int(req.params.id); const old = db.prepare('SELECT * FROM banners WHERE id=?').get(id);
  if (!old) return res.redirect('/admin/banners');
  const d = { ...bannerData(req), id, image: old.image };
  if (req.file) { removeUpload(old.image); d.image = `/uploads/${req.file.filename}`; }
  db.prepare('UPDATE banners SET title=@title,subtitle=@subtitle,image=@image,link_type=@link_type,link_value=@link_value,sort_order=@sort_order,active=@active WHERE id=@id').run(d);
  flash(req, 'Banner actualizado'); res.redirect('/admin/banners');
});
admin.post('/banners/:id/eliminar', upload.none(), (req, res) => {
  const b = db.prepare('SELECT * FROM banners WHERE id=?').get(int(req.params.id));
  if (b) { db.prepare('DELETE FROM banners WHERE id=?').run(b.id); removeUpload(b.image); flash(req, 'Banner eliminado'); }
  res.redirect('/admin/banners');
});

// Ajustes
admin.get('/ajustes', (req, res) => render(req, res, 'Ajustes', '/admin/ajustes', A.settingsPage({ s: getSettings() })));
admin.post('/ajustes', upload.single('logo'), (req, res) => {
  const b = req.body; const s = getSettings();
  const wa = String(b.whatsapp || '').replace(/\D/g, '');
  if (wa.length < 8) { flash(req, 'Número de WhatsApp inválido. Usa formato internacional, ej. 573001234567', 'error'); return res.redirect('/admin/ajustes'); }
  setSetting('store_name', String(b.store_name || '').trim() || s.store_name);
  setSetting('tagline', String(b.tagline || '').trim());
  setSetting('whatsapp', wa);
  setSetting('wa_template', String(b.wa_template || '').trim() || s.wa_template);
  setSetting('default_low_stock', Math.max(0, int(b.default_low_stock, 5)));
  setSetting('show_stock_count', b.show_stock_count ? '1' : '0');
  if (req.file) { removeUpload(s.logo); setSetting('logo', `/uploads/${req.file.filename}`); }
  else if (b.remove_logo) { removeUpload(s.logo); setSetting('logo', ''); }
  flash(req, 'Ajustes guardados'); res.redirect('/admin/ajustes');
});

app.use('/admin', admin);
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) { req.session.flash = { msg: 'La imagen supera 5 MB o no es válida', type: 'error' }; return res.redirect(safeBack(new URL(req.get('Referer') || 'http://x/admin').pathname, '/admin')); }
  res.status(500).send('Error interno');
});
app.use((req, res) => res.status(404).send('<p style="font-family:sans-serif;text-align:center;margin-top:4rem">Página no encontrada · <a href="/">Volver a la tienda</a></p>'));

app.listen(PORT, () => console.log(`Catálogo en http://localhost:${PORT}  ·  Panel: http://localhost:${PORT}/admin`));
