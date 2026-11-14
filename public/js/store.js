(function () {
  // Carrusel
  const slides = [...document.querySelectorAll('#carousel .slide')];
  const dots = [...document.querySelectorAll('#carousel .dot')];
  let cur = 0, timer;
  function show(i) {
    if (!slides.length) return;
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('opacity-100', k === cur); s.classList.toggle('opacity-0', k !== cur); s.classList.toggle('pointer-events-none', k !== cur); });
    dots.forEach((d, k) => { d.classList.toggle('bg-white', k === cur); d.classList.toggle('bg-white/50', k !== cur); });
  }
  function auto() { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => show(cur + 1), 5000); }
  document.getElementById('prev')?.addEventListener('click', () => { show(cur - 1); auto(); });
  document.getElementById('next')?.addEventListener('click', () => { show(cur + 1); auto(); });
  dots.forEach((d) => d.addEventListener('click', () => { show(+d.dataset.i); auto(); }));
  let x0 = null;
  const car = document.getElementById('carousel');
  car?.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  car?.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(cur + (dx < 0 ? 1 : -1)); auto(); } x0 = null; });
  auto();

  // Filtro por categoría y búsqueda
  let cat = '', q = '';
  const chips = [...document.querySelectorAll('#chips .chip')];
  const search = document.getElementById('search');
  function apply() {
    let visible = 0;
    document.querySelectorAll('.cat-section').forEach((sec) => {
      const isFeat = sec.dataset.section === '__featured';
      let n = 0;
      sec.querySelectorAll('.product-card').forEach((card) => {
        const ok = (!q || card.dataset.name.includes(q)) && (!cat || card.dataset.cat === cat) && !(isFeat && (cat || q));
        card.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      sec.style.display = n ? '' : 'none';
      if (!isFeat) visible += n;
    });
    document.getElementById('noresults')?.classList.toggle('hidden', visible > 0);
  }
  chips.forEach((c) => c.addEventListener('click', () => { chips.forEach((x) => x.classList.remove('active')); c.classList.add('active'); cat = c.dataset.cat; apply(); }));
  search?.addEventListener('input', () => { q = search.value.trim().toLowerCase(); apply(); });
})();
