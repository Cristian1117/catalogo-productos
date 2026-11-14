// Prueba de punta a punta + capturas. Requiere el servidor corriendo.
// Uso: BASE=http://localhost:3000 ADMIN_PASSWORD=... node scripts/screenshots.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const assert = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('✔', m); };

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-CO' });
  const page = await ctx.newPage();

  // Generar imágenes PNG de prueba con el propio navegador
  async function makePng(file, w, h, bg, text) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:grid;place-items:center;font:bold ${Math.round(h / 6)}px Arial;color:#fff">${text}</body>`);
    await p.screenshot({ path: file }); await p.close(); return file;
  }
  const tmp = fs.mkdtempSync('/tmp/cat-');
  const prodImg = await makePng(path.join(tmp, 'perfume.png'), 600, 600, 'linear-gradient(135deg,#f472b6,#8b5cf6)', '🌸 Perfume');
  const banImg = await makePng(path.join(tmp, 'banner.png'), 1600, 600, 'linear-gradient(90deg,#0f172a,#f59e0b)', '');

  // Login
  await page.goto(BASE + '/admin');
  assert(page.url().includes('/admin/login'), 'el panel redirige al login sin sesión');
  await page.fill('input[name=password]', 'clave-incorrecta'); await page.click('button');
  assert((await page.content()).includes('Contraseña incorrecta'), 'contraseña incorrecta rechazada');
  await page.fill('input[name=password]', process.env.ADMIN_PASSWORD); await page.click('button');
  await page.waitForURL(BASE + '/admin');
  assert(await page.isVisible('text=Productos con stock bajo o agotados'), 'login correcto y resumen con alertas de stock');

  // Crear categoría
  await page.goto(BASE + '/admin/categorias');
  await page.fill('form[action="/admin/categorias"] input[name=name]', 'Perfumes');
  await page.click('form[action="/admin/categorias"] button');
  assert(await page.isVisible('text=Categoría “Perfumes” creada'), 'categoría creada');

  // Crear producto
  await page.goto(BASE + '/admin/productos/nuevo');
  await page.fill('input[name=name]', 'Perfume Floral 100 ml');
  await page.fill('textarea[name=description]', 'Fragancia fresca y duradera, ideal para regalar.');
  await page.fill('input[name=price]', '85000');
  await page.selectOption('select[name=category_id]', { label: 'Perfumes' });
  await page.fill('input[name=stock]', '2');
  await page.fill('input[name=low_stock]', '3');
  await page.setInputFiles('input[name=image]', prodImg);
  await page.check('input[name=featured]');
  await page.click('button:has-text("Crear producto")');
  assert(await page.isVisible('text=Producto “Perfume Floral 100 ml” creado'), 'producto creado con imagen');

  // Ajuste rápido de stock (+1 y luego −1)
  const row = page.locator('tr', { hasText: 'Perfume Floral 100 ml' });
  await row.locator('button[value="1"][name=delta]').click();
  assert(await page.isVisible('text=Stock de “Perfume Floral 100 ml”: 3 unidad(es)'), 'ajuste rápido +1');
  await page.locator('tr', { hasText: 'Perfume Floral 100 ml' }).locator('button[value="-1"]').click();
  assert(await page.isVisible('text=: 2 unidad(es)'), 'ajuste rápido −1');

  // Filtro de stock
  await page.goto(BASE + '/admin/productos?stock=agotado');
  const outNames = await page.locator('tbody tr').allInnerTexts();
  assert(outNames.length >= 1 && outNames.every((t) => t.includes('Agotado')), `filtro "Agotados" (${outNames.length} producto/s)`);
  await page.goto(BASE + '/admin/productos?stock=bajo');
  assert((await page.locator('tbody tr', { hasText: 'Perfume Floral' }).count()) === 1, 'filtro "Stock bajo" incluye el nuevo producto');

  // Crear banner que enlaza al producto
  await page.goto(BASE + '/admin/banners');
  const bf = page.locator('form[action="/admin/banners"]');
  await bf.locator('input[name=image]').setInputFiles(banImg);
  await bf.locator('input[name=title]').fill('Perfumes para regalar');
  await bf.locator('input[name=subtitle]').fill('Llegaron nuevas fragancias 🌸');
  await bf.locator('input[name=sort_order]').fill('0');
  await bf.locator('select[name=link_type]').selectOption('category');
  await bf.locator('select[name=link_category]').selectOption({ label: 'Perfumes' });
  await bf.locator('button:has-text("Crear banner")').click();
  assert(await page.isVisible('text=Banner creado'), 'banner creado');

  await page.goto(BASE + '/admin/productos');
  await page.screenshot({ path: path.join(OUT, 'admin-productos.png'), fullPage: true });
  await page.goto(BASE + '/admin');
  await page.screenshot({ path: path.join(OUT, 'admin-resumen.png'), fullPage: true });
  await page.goto(BASE + '/admin/banners');
  await page.screenshot({ path: path.join(OUT, 'admin-banners.png'), fullPage: true });
  await page.goto(BASE + '/admin/productos/nuevo');
  await page.screenshot({ path: path.join(OUT, 'admin-nuevo-producto.png'), fullPage: true });
  await page.goto(BASE + '/admin/ajustes');
  await page.screenshot({ path: path.join(OUT, 'admin-ajustes.png'), fullPage: true });

  // Verificar tienda
  const shop = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'es-CO' });
  await shop.goto(BASE + '/', { waitUntil: 'networkidle' });
  const card = shop.locator('section[data-section="perfumes"] .product-card', { hasText: 'Perfume Floral 100 ml' });
  assert(await card.count() === 1, 'producto nuevo aparece en su categoría en la tienda');
  assert((await card.innerText()).includes('$85.000'), 'precio en formato COP ($85.000)');
  assert((await card.innerText()).includes('Últimas unidades'), 'muestra “¡Últimas unidades!” con stock bajo');
  const href = await card.locator('a.wa-btn').getAttribute('href');
  const u = new URL(href);
  const text = u.searchParams.get('text');
  assert(u.origin === 'https://wa.me' && u.pathname === '/573122926519', 'enlace WhatsApp → wa.me/573122926519');
  assert(text.includes('Perfume Floral 100 ml') && text.includes('$85.000') && /#producto-\d+/.test(text), 'mensaje con producto, precio y link');
  console.log('   Mensaje:', JSON.stringify(text));
  assert(await shop.locator('#carousel .slide', { hasText: 'Perfumes para regalar' }).count() === 1, 'banner nuevo en el carrusel');
  const out = shop.locator('section:not([data-section="__featured"]) .product-card', { hasText: 'Vestido floral' });
  assert((await out.innerText()).includes('Agotado') && (await out.locator('button.wa-btn[disabled]').count()) === 1 && (await out.locator('a.wa-btn').count()) === 0, 'producto sin stock: “Agotado” y botón deshabilitado');

  await shop.screenshot({ path: path.join(OUT, 'tienda-escritorio.png') });
  await shop.screenshot({ path: path.join(OUT, 'tienda-escritorio-completa.png'), fullPage: true });

  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CO' });
  const m = await mob.newPage();
  await m.goto(BASE + '/', { waitUntil: 'networkidle' });
  await m.screenshot({ path: path.join(OUT, 'tienda-movil.png') });
  await m.screenshot({ path: path.join(OUT, 'tienda-movil-completa.png'), fullPage: true });
  await m.click('#chips .chip[data-cat="accesorios"]');
  await m.waitForTimeout(300);
  assert(await m.locator('section[data-section="ropa"]').isHidden(), 'filtro por categoría en la tienda');
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.screenshot({ path: path.join(OUT, 'tienda-movil-filtro-accesorios.png') });
  const am = await mob.newPage();
  await am.goto(BASE + '/admin/login');
  await am.fill('input[name=password]', process.env.ADMIN_PASSWORD); await am.click('button'); await am.waitForURL(BASE + '/admin');
  await am.goto(BASE + '/admin/productos?stock=alerta');
  await am.screenshot({ path: path.join(OUT, 'admin-movil-stock.png'), fullPage: true });

  await browser.close();
  console.log('\nTodo OK. Capturas en', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
