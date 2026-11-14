const { esc, cop, stockState, waMessage, waLink } = require('../helpers');

function head(title, s) {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(s.tagline)}">
<meta property="og:title" content="${esc(s.store_name)}"><meta property="og:description" content="${esc(s.tagline)}">
${s.logo ? `<link rel="icon" href="${esc(s.logo)}">` : ''}
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="/css/app.css">
</head>`;
}

function waIcon(cls = 'w-5 h-5') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.44 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.3l5.7-1.5a11.33 11.33 0 0 0 5.77 1.47c6.27 0 11.37-5.1 11.37-11.36 0-3.04-1.18-5.89-3.33-8.04"/></svg>`;
}

function bannerHref(b) {
  if (b.link_type === 'product' && b.link_value) return `#producto-${encodeURIComponent(b.link_value)}`;
  if (b.link_type === 'category' && b.link_value) return `#cat-${encodeURIComponent(b.link_value)}`;
  if (b.link_type === 'url' && /^https?:\/\//i.test(b.link_value)) return b.link_value;
  return '';
}

function productCard(p, s, baseUrl) {
  const st = stockState(p);
  const price = cop(p.price);
  const link = `${baseUrl}/#producto-${p.id}`;
  const msg = waMessage(s.wa_template, { tienda: s.store_name, producto: p.name, precio: price, categoria: p.category_name, link });
  const href = waLink(s.whatsapp, msg);
  const showCount = s.show_stock_count === '1';
  const badge = st === 'agotado'
    ? `<span class="absolute top-2 left-2 bg-gray-900/85 text-white text-xs font-bold px-2.5 py-1 rounded-full">Agotado</span>`
    : st === 'bajo'
      ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">¡Últimas unidades!${showCount ? ` (${p.stock})` : ''}</span>`
      : '';
  const feat = p.featured ? `<span class="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">★ Destacado</span>` : '';
  const btn = st === 'agotado'
    ? `<button disabled class="wa-btn mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-200 text-gray-500 font-semibold py-2.5 text-sm cursor-not-allowed" aria-disabled="true">Agotado</button>`
    : `<a href="${esc(href)}" target="_blank" rel="noopener" class="wa-btn mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold py-2.5 text-sm shadow-sm transition">${waIcon()} Pedir por WhatsApp</a>`;
  return `<article id="producto-${p.id}" class="product-card group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col ${st === 'agotado' ? 'is-out' : ''}"
    data-name="${esc((p.name + ' ' + (p.description || '')).toLowerCase())}" data-cat="${esc(p.category_slug || '')}">
    <div class="relative aspect-square bg-gray-100 overflow-hidden">
      ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300 ${st === 'agotado' ? 'grayscale opacity-70' : ''}">` : `<div class="w-full h-full grid place-items-center text-gray-400 text-sm">Sin imagen</div>`}
      ${badge}${feat}
    </div>
    <div class="p-3 sm:p-4 flex flex-col flex-1">
      <h3 class="font-semibold text-gray-900 leading-snug text-sm sm:text-base">${esc(p.name)}</h3>
      <p class="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2 flex-1">${esc(p.description)}</p>
      <p class="mt-2 text-lg sm:text-xl font-extrabold text-gray-900">${price}</p>
      ${btn}
    </div>
  </article>`;
}

function storePage({ s, banners, categories, products, baseUrl }) {
  const byCat = categories.map((c) => ({ ...c, items: products.filter((p) => p.category_id === c.id) })).filter((c) => c.items.length);
  const uncategorized = products.filter((p) => !categories.some((c) => c.id === p.category_id));
  if (uncategorized.length) byCat.push({ id: 0, name: 'Otros', slug: 'otros', items: uncategorized });
  const featured = products.filter((p) => p.featured);
  const generalWa = waLink(s.whatsapp, `Hola ${s.store_name} 👋, quiero hacer un pedido.`);

  const slides = banners.map((b, i) => {
    const href = bannerHref(b);
    const inner = `<div class="relative w-full h-full">
      ${b.image ? `<img src="${esc(b.image)}" alt="${esc(b.title)}" class="absolute inset-0 w-full h-full object-cover">` : `<div class="absolute inset-0 bg-gradient-to-br from-indigo-600 to-pink-600"></div>`}
      <div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent"></div>
      <div class="relative h-full flex flex-col justify-center px-12 sm:px-16 max-w-xl text-white">
        ${b.title ? `<h2 class="text-2xl sm:text-4xl font-extrabold drop-shadow">${esc(b.title)}</h2>` : ''}
        ${b.subtitle ? `<p class="mt-2 text-sm sm:text-lg text-white/90">${esc(b.subtitle)}</p>` : ''}
        ${href ? `<span class="mt-4 inline-flex w-fit items-center gap-1 bg-white text-gray-900 font-semibold text-sm px-4 py-2 rounded-full shadow">Ver ahora →</span>` : ''}
      </div></div>`;
    return `<div class="slide absolute inset-0 transition-opacity duration-700 ${i === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}" data-i="${i}">
      ${href ? `<a href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="block w-full h-full">${inner}</a>` : inner}</div>`;
  }).join('');

  return `${head(s.store_name, s)}
<body class="bg-gray-50 text-gray-800 antialiased">
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
  <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
    ${s.logo ? `<img src="${esc(s.logo)}" alt="Logo" class="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30">` : `<div class="w-10 h-10 rounded-full bg-emerald-500 grid place-items-center text-white font-bold">${esc((s.store_name || 'T')[0])}</div>`}
    <div class="min-w-0 flex-1">
      <h1 class="font-extrabold text-lg leading-tight truncate">${esc(s.store_name)}</h1>
      <p class="text-xs text-gray-500 truncate">${esc(s.tagline)}</p>
    </div>
    <a href="${esc(generalWa)}" target="_blank" rel="noopener" class="hidden sm:inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-full">${waIcon('w-4 h-4')} Escríbenos</a>
  </div>
</header>

<main class="max-w-6xl mx-auto px-4 pb-24">
  ${banners.length ? `<section class="mt-4">
    <div id="carousel" class="relative h-44 sm:h-72 md:h-80 rounded-3xl overflow-hidden shadow-lg">${slides}
      ${banners.length > 1 ? `<button id="prev" class="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white grid place-items-center shadow" aria-label="Anterior">‹</button>
      <button id="next" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white grid place-items-center shadow" aria-label="Siguiente">›</button>
      <div class="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">${banners.map((_, i) => `<button class="dot w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}" data-i="${i}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>` : ''}
    </div></section>` : ''}

  <section class="sticky top-[65px] z-20 bg-gray-50/95 backdrop-blur pt-4 pb-3">
    <div class="relative">
      <input id="search" type="search" placeholder="Buscar productos..." class="w-full rounded-2xl border-0 ring-1 ring-gray-200 bg-white px-4 py-3 pl-10 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
      <svg class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    </div>
    <nav id="chips" class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
      <button class="chip active" data-cat="">Todos</button>
      ${byCat.map((c) => `<button class="chip" data-cat="${esc(c.slug)}">${esc(c.name)}</button>`).join('')}
    </nav>
  </section>

  ${featured.length ? `<section id="destacados" class="mt-4 cat-section" data-section="__featured">
    <h2 class="text-xl font-bold mb-3">⭐ Destacados</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">${featured.map((p) => productCard({ ...p, id: p.id }, s, baseUrl).replace(`id="producto-${p.id}"`, '')).join('')}</div>
  </section>` : ''}

  ${byCat.map((c) => `<section id="cat-${esc(c.id || c.slug)}" class="mt-8 cat-section scroll-mt-40" data-section="${esc(c.slug)}">
    <h2 class="text-xl font-bold mb-3">${esc(c.name)} <span class="text-sm font-medium text-gray-400">(${c.items.length})</span></h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">${c.items.map((p) => productCard(p, s, baseUrl)).join('')}</div>
  </section>`).join('')}
  ${!products.length ? `<p class="mt-16 text-center text-gray-400">Aún no hay productos publicados.</p>` : ''}
  <p id="noresults" class="hidden mt-16 text-center text-gray-400">No encontramos productos con esa búsqueda.</p>
</main>

<footer class="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">© ${new Date().getFullYear()} ${esc(s.store_name)} · Pedidos por WhatsApp</footer>
<a href="${esc(generalWa)}" target="_blank" rel="noopener" class="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-xl hover:scale-105 transition" aria-label="WhatsApp">${waIcon('w-7 h-7')}</a>
<script src="/js/store.js"></script>
</body></html>`;
}

module.exports = { storePage, waIcon };
