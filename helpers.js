const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cop = (n) => '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const waDigits = (n) => String(n || '').replace(/\D/g, '');

function stockState(p) {
  if (p.stock <= 0) return 'agotado';
  if (p.stock <= p.low_stock) return 'bajo';
  return 'ok';
}

function waMessage(tpl, { tienda, producto, precio, categoria, link }) {
  return String(tpl || '')
    .replaceAll('{tienda}', tienda || '').replaceAll('{producto}', producto || '')
    .replaceAll('{precio}', precio || '').replaceAll('{categoria}', categoria || '')
    .replaceAll('{link}', link || '');
}
function waLink(number, text) {
  return `https://wa.me/${waDigits(number)}?text=${encodeURIComponent(text)}`;
}

module.exports = { esc, cop, waDigits, stockState, waMessage, waLink };
