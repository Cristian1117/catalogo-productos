const { esc, cop, stockState } = require('../helpers');

const NAV = [
  ['/admin', 'Resumen', '📊'], ['/admin/productos', 'Productos', '📦'], ['/admin/categorias', 'Categorías', '🗂️'],
  ['/admin/banners', 'Banners', '🖼️'], ['/admin/ajustes', 'Ajustes', '⚙️'],
];

function layout({ title, active, body, flash, s }) {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Panel</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="/css/admin.css"></head>
<body class="bg-slate-100 text-slate-800 antialiased">
<div class="md:flex min-h-screen">
  <aside class="md:w-60 bg-slate-900 text-slate-100 md:min-h-screen">
    <div class="px-4 py-4 flex items-center justify-between md:block">
      <div class="font-extrabold text-lg truncate">${esc(s.store_name)}</div>
      <div class="text-xs text-slate-400 hidden md:block">Panel administrativo</div>
    </div>
    <nav class="flex md:flex-col overflow-x-auto px-2 pb-2 gap-1 text-sm">
      ${NAV.map(([h, l, i]) => `<a href="${h}" class="whitespace-nowrap px-3 py-2 rounded-lg ${active === h ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}">${i} ${l}</a>`).join('')}
      <a href="/" target="_blank" class="whitespace-nowrap px-3 py-2 rounded-lg hover:bg-slate-800">🛍️ Ver tienda</a>
      <form method="post" action="/admin/logout" class="md:mt-4"><button class="whitespace-nowrap px-3 py-2 rounded-lg hover:bg-slate-800 text-left w-full text-rose-300">⎋ Salir</button></form>
    </nav>
  </aside>
  <main class="flex-1 p-4 md:p-8 max-w-6xl">
    <h1 class="text-2xl font-bold mb-4">${esc(title)}</h1>
    ${flash ? `<div class="mb-4 rounded-lg px-4 py-3 text-sm ${flash.type === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">${esc(flash.msg)}</div>` : ''}
    ${body}
  </main>
</div>
<script src="/js/admin.js"></script>
</body></html>`;
}

function loginPage(error, s) {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ingresar · Panel</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 to-emerald-900 p-4">
<form method="post" action="/admin/login" class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
  <h1 class="text-xl font-bold">Panel administrativo</h1><p class="text-sm text-slate-500 mb-6">${esc(s.store_name)}</p>
  ${error ? `<p class="mb-4 text-sm bg-rose-100 text-rose-700 rounded-lg px-3 py-2">${esc(error)}</p>` : ''}
  <label class="block text-sm font-medium mb-1">Contraseña</label>
  <input type="password" name="password" autofocus required class="inp">
  <button class="mt-6 w-full btn-primary">Ingresar</button>
</form><link rel="stylesheet" href="/css/admin.css"></body></html>`;
}

function stockBadge(p) {
  const st = stockState(p);
  if (st === 'agotado') return `<span class="badge bg-rose-100 text-rose-700">Agotado</span>`;
  if (st === 'bajo') return `<span class="badge bg-amber-100 text-amber-800">Stock bajo</span>`;
  return `<span class="badge bg-emerald-100 text-emerald-700">Disponible</span>`;
}

function stockControl(p, back) {
  return `<form method="post" action="/admin/productos/${p.id}/stock" class="flex items-center gap-1 stock-form">
    <input type="hidden" name="back" value="${esc(back)}">
    <button name="delta" value="-1" class="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold" title="Restar 1">−</button>
    <input name="set" type="number" min="0" value="${p.stock}" class="w-16 h-8 text-center rounded-lg ring-1 ring-slate-300 text-sm" aria-label="Stock">
    <button name="delta" value="1" class="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold" title="Sumar 1">+</button>
    <button name="apply" value="1" class="h-8 px-2 rounded-lg bg-slate-800 text-white text-xs" title="Guardar cantidad">OK</button>
  </form>`;
}

function dashboard({ counts, lowList, s }) {
  const card = (l, v, c, h) => `<a href="${h}" class="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5 block"><div class="text-xs text-slate-500">${l}</div><div class="text-3xl font-extrabold ${c}">${v}</div></a>`;
  return `<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    ${card('Productos', counts.products, '', '/admin/productos')}
    ${card('Categorías', counts.categories, '', '/admin/categorias')}
    ${card('Banners activos', counts.banners, '', '/admin/banners')}
    ${card('Stock bajo', counts.low, 'text-amber-600', '/admin/productos?stock=bajo')}
    ${card('Agotados', counts.out, 'text-rose-600', '/admin/productos?stock=agotado')}
  </div>
  <div class="mt-6 bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4">
    <h2 class="font-bold mb-3">⚠️ Productos con stock bajo o agotados</h2>
    ${lowList.length ? `<div class="divide-y">${lowList.map((p) => `<div class="py-2 flex flex-wrap items-center gap-3">
      <img src="${esc(p.image)}" class="w-10 h-10 rounded object-cover bg-slate-100"><div class="flex-1 min-w-[8rem]"><div class="font-medium">${esc(p.name)}</div><div class="text-xs text-slate-500">Mín.: ${p.low_stock} · ${stockBadge(p)}</div></div>
      ${stockControl(p, '/admin')}</div>`).join('')}</div>` : '<p class="text-sm text-slate-500">Todo el inventario está en buen nivel ✅</p>'}
  </div>
  <p class="mt-6 text-sm text-slate-500">WhatsApp configurado: <b>+${esc(s.whatsapp)}</b> · <a class="underline" href="/admin/ajustes">cambiar</a></p>`;
}

function productList({ products, categories, q, filter, cat }) {
  const back = `/admin/productos?stock=${encodeURIComponent(filter)}&cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`;
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  return `<div class="flex flex-wrap gap-2 items-end mb-4">
    <form class="flex flex-wrap gap-2 items-end flex-1" method="get">
      <input name="q" value="${esc(q)}" placeholder="Buscar..." class="inp !w-44">
      <select name="cat" class="inp !w-40">${opt('', 'Todas las categorías', cat)}${categories.map((c) => opt(c.id, c.name, cat)).join('')}</select>
      <select name="stock" class="inp !w-44">${opt('', 'Todo el stock', filter)}${opt('bajo', 'Stock bajo', filter)}${opt('agotado', 'Agotados', filter)}${opt('alerta', 'Bajo o agotado', filter)}</select>
      <button class="btn-secondary">Filtrar</button>
    </form>
    <a href="/admin/productos/nuevo" class="btn-primary">+ Nuevo producto</a>
  </div>
  <div class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 overflow-x-auto">
  <table class="w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
    <th class="p-3">Producto</th><th class="p-3">Categoría</th><th class="p-3">Precio</th><th class="p-3">Stock</th><th class="p-3">Estado</th><th class="p-3"></th></tr></thead>
  <tbody class="divide-y">
  ${products.map((p) => `<tr class="${stockState(p) === 'agotado' ? 'bg-rose-50/50' : stockState(p) === 'bajo' ? 'bg-amber-50/50' : ''}">
    <td class="p-3"><div class="flex items-center gap-3"><img src="${esc(p.image)}" class="w-12 h-12 rounded-lg object-cover bg-slate-100"><div><div class="font-medium">${esc(p.name)}</div>
      <div class="text-xs text-slate-500">${p.featured ? '★ Destacado · ' : ''}${p.active ? 'Visible' : '<span class="text-rose-600">Oculto</span>'}</div></div></div></td>
    <td class="p-3">${esc(p.category_name || '—')}</td>
    <td class="p-3 font-semibold whitespace-nowrap">${cop(p.price)}</td>
    <td class="p-3">${stockControl(p, back)}<div class="text-[11px] text-slate-400 mt-1">Alerta en ≤ ${p.low_stock}</div></td>
    <td class="p-3">${stockBadge(p)}</td>
    <td class="p-3 whitespace-nowrap text-right">
      <a href="/admin/productos/${p.id}/editar" class="text-emerald-700 font-medium hover:underline">Editar</a>
      <form method="post" action="/admin/productos/${p.id}/eliminar" class="inline" onsubmit="return confirm('¿Eliminar este producto?')"><button class="ml-3 text-rose-600 hover:underline">Eliminar</button></form>
    </td></tr>`).join('') || `<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay productos con ese filtro.</td></tr>`}
  </tbody></table></div>`;
}

function productForm({ p, categories, s }) {
  const isNew = !p.id;
  return `<form method="post" enctype="multipart/form-data" action="${isNew ? '/admin/productos/nuevo' : `/admin/productos/${p.id}/editar`}" class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-5 grid md:grid-cols-2 gap-4 max-w-3xl">
    <div class="md:col-span-2"><label class="lbl">Nombre *</label><input name="name" required value="${esc(p.name)}" class="inp"></div>
    <div class="md:col-span-2"><label class="lbl">Descripción</label><textarea name="description" rows="3" class="inp">${esc(p.description)}</textarea></div>
    <div><label class="lbl">Precio (COP) *</label><input name="price" required inputmode="numeric" value="${p.price ?? ''}" placeholder="25000" class="inp"><p class="hint">Solo números, sin puntos. Ej: 25000 → $25.000</p></div>
    <div><label class="lbl">Categoría</label><select name="category_id" class="inp"><option value="">— Sin categoría —</option>${categories.map((c) => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div><label class="lbl">Stock (unidades)</label><input name="stock" type="number" min="0" value="${p.stock ?? 0}" class="inp"></div>
    <div><label class="lbl">Alerta de stock bajo en ≤</label><input name="low_stock" type="number" min="0" value="${p.low_stock ?? s.default_low_stock}" class="inp"><p class="hint">En la tienda se mostrará “¡Últimas unidades!”</p></div>
    <div class="md:col-span-2"><label class="lbl">Imagen ${isNew ? '' : '(deja vacío para conservar la actual)'}</label>
      <div class="flex items-center gap-4">${p.image ? `<img src="${esc(p.image)}" class="w-20 h-20 rounded-lg object-cover bg-slate-100" data-preview>` : '<img class="w-20 h-20 rounded-lg object-cover bg-slate-100 hidden" data-preview>'}
      <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" class="text-sm" data-preview-input></div></div>
    <label class="flex items-center gap-2"><input type="checkbox" name="active" value="1" ${p.active ?? 1 ? 'checked' : ''} class="w-4 h-4"> Visible en la tienda</label>
    <label class="flex items-center gap-2"><input type="checkbox" name="featured" value="1" ${p.featured ? 'checked' : ''} class="w-4 h-4"> ★ Destacado</label>
    <div class="md:col-span-2 flex gap-2"><button class="btn-primary">${isNew ? 'Crear producto' : 'Guardar cambios'}</button><a href="/admin/productos" class="btn-secondary">Cancelar</a></div>
  </form>`;
}

function categoriesPage({ categories }) {
  return `<form method="post" action="/admin/categorias" class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4 flex flex-wrap gap-2 items-end mb-4">
    <div class="flex-1 min-w-[10rem]"><label class="lbl">Nueva categoría</label><input name="name" required class="inp" placeholder="Ej: Perfumes"></div>
    <div><label class="lbl">Orden</label><input name="sort_order" type="number" value="${categories.length + 1}" class="inp !w-20"></div>
    <button class="btn-primary">Agregar</button></form>
  <div class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 divide-y">
  ${categories.map((c) => `<div class="p-3 flex flex-wrap gap-2 items-center">
    <form method="post" action="/admin/categorias/${c.id}" class="flex flex-wrap gap-2 items-center flex-1">
      <input name="name" value="${esc(c.name)}" class="inp !w-48" required>
      <input name="sort_order" type="number" value="${c.sort_order}" class="inp !w-20" title="Orden">
      <label class="text-sm flex items-center gap-1"><input type="checkbox" name="active" value="1" ${c.active ? 'checked' : ''}> Activa</label>
      <span class="text-xs text-slate-400">${c.count} producto(s)</span>
      <button class="btn-secondary !py-1.5">Guardar</button></form>
    <form method="post" action="/admin/categorias/${c.id}/eliminar" onsubmit="return confirm('¿Eliminar la categoría? Los productos quedarán sin categoría.')"><button class="text-rose-600 text-sm hover:underline">Eliminar</button></form>
  </div>`).join('') || '<p class="p-4 text-slate-400 text-sm">Aún no hay categorías.</p>'}</div>`;
}

function bannersPage({ banners, products, categories }) {
  const linkSel = (b) => `<select name="link_type" class="inp" data-linktype>
      ${[['none', 'Sin enlace'], ['category', 'Categoría'], ['product', 'Producto'], ['url', 'URL externa']].map(([v, l]) => `<option value="${v}" ${b.link_type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select name="link_category" class="inp mt-1" data-for="category">${categories.map((c) => `<option value="${c.id}" ${b.link_type === 'category' && String(c.id) === b.link_value ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <select name="link_product" class="inp mt-1" data-for="product">${products.map((p) => `<option value="${p.id}" ${b.link_type === 'product' && String(p.id) === b.link_value ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <input name="link_url" class="inp mt-1" data-for="url" placeholder="https://..." value="${b.link_type === 'url' ? esc(b.link_value) : ''}">`;
  const form = (b) => `<form method="post" enctype="multipart/form-data" action="${b.id ? `/admin/banners/${b.id}` : '/admin/banners'}" class="grid md:grid-cols-[200px_1fr_1fr] gap-3 items-start">
    <div>${b.image ? `<img src="${esc(b.image)}" class="w-full aspect-[8/3] object-cover rounded-lg bg-slate-100" data-preview>` : '<img class="w-full aspect-[8/3] object-cover rounded-lg bg-slate-100 hidden" data-preview>'}
      <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" class="mt-2 text-xs w-full" data-preview-input ${b.id ? '' : 'required'}><p class="hint">Recomendado 1600×600 px</p></div>
    <div class="space-y-2"><input name="title" value="${esc(b.title)}" placeholder="Título" class="inp"><input name="subtitle" value="${esc(b.subtitle)}" placeholder="Subtítulo" class="inp">
      <div class="flex gap-3 items-center"><label class="text-sm">Orden <input name="sort_order" type="number" value="${b.sort_order ?? 0}" class="inp !w-20 inline-block"></label>
      <label class="text-sm flex items-center gap-1"><input type="checkbox" name="active" value="1" ${b.active ?? 1 ? 'checked' : ''}> Activo</label></div></div>
    <div><label class="lbl">Al tocar el banner…</label>${linkSel(b)}
      <div class="mt-3 flex gap-2"><button class="btn-primary !py-1.5">${b.id ? 'Guardar' : 'Crear banner'}</button>
      ${b.id ? `<button formaction="/admin/banners/${b.id}/eliminar" formnovalidate onclick="return confirm('¿Eliminar banner?')" class="btn-secondary !py-1.5 !text-rose-600">Eliminar</button>` : ''}</div></div>
  </form>`;
  return `<div class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4 mb-6"><h2 class="font-bold mb-3">Nuevo banner</h2>${form({ link_type: 'none', sort_order: banners.length + 1 })}</div>
  <div class="space-y-4">${banners.map((b) => `<div class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4 ${b.active ? '' : 'opacity-60'}">${form(b)}</div>`).join('')}</div>`;
}

function settingsPage({ s }) {
  return `<form method="post" enctype="multipart/form-data" action="/admin/ajustes" class="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-5 grid gap-4 max-w-2xl">
    <div><label class="lbl">Nombre de la tienda</label><input name="store_name" value="${esc(s.store_name)}" class="inp" required></div>
    <div><label class="lbl">Frase / eslogan</label><input name="tagline" value="${esc(s.tagline)}" class="inp"></div>
    <div><label class="lbl">Logo</label><div class="flex items-center gap-4">${s.logo ? `<img src="${esc(s.logo)}" class="w-16 h-16 rounded-full object-cover" data-preview>` : '<img class="w-16 h-16 rounded-full object-cover hidden" data-preview>'}
      <input type="file" name="logo" accept="image/jpeg,image/png,image/webp,image/gif" class="text-sm" data-preview-input>
      ${s.logo ? '<label class="text-sm flex items-center gap-1"><input type="checkbox" name="remove_logo" value="1"> Quitar logo</label>' : ''}</div></div>
    <div><label class="lbl">Número de WhatsApp (formato internacional)</label><input name="whatsapp" value="${esc(s.whatsapp)}" class="inp" placeholder="573001234567" required>
      <p class="hint">Código de país + número, sin “+”, espacios ni guiones. Colombia: 57 + celular (ej. 573001234567).</p></div>
    <div><label class="lbl">Mensaje de WhatsApp por defecto</label><textarea name="wa_template" rows="5" class="inp font-mono text-xs">${esc(s.wa_template)}</textarea>
      <p class="hint">Variables: {tienda} {producto} {precio} {categoria} {link}</p></div>
    <div class="grid grid-cols-2 gap-4">
      <div><label class="lbl">Alerta de stock bajo por defecto</label><input name="default_low_stock" type="number" min="0" value="${esc(s.default_low_stock)}" class="inp"></div>
      <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" name="show_stock_count" value="1" ${s.show_stock_count === '1' ? 'checked' : ''}> Mostrar cantidad restante en “Últimas unidades”</label>
    </div>
    <div><button class="btn-primary">Guardar ajustes</button></div>
  </form>`;
}

module.exports = { layout, loginPage, dashboard, productList, productForm, categoriesPage, bannersPage, settingsPage };
