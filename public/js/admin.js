// Vista previa de imágenes
document.querySelectorAll('[data-preview-input]').forEach((inp) => {
  inp.addEventListener('change', () => {
    const img = inp.closest('form, div').parentElement.querySelector('[data-preview]') || inp.parentElement.querySelector('[data-preview]');
    const f = inp.files[0]; if (!img || !f) return;
    img.src = URL.createObjectURL(f); img.classList.remove('hidden');
  });
});
// Mostrar el selector de enlace correcto en banners
document.querySelectorAll('[data-linktype]').forEach((sel) => {
  const wrap = sel.parentElement;
  const sync = () => wrap.querySelectorAll('[data-for]').forEach((el) => { el.style.display = el.dataset.for === sel.value ? '' : 'none'; });
  sel.addEventListener('change', sync); sync();
});
