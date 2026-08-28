const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

// «12 августа 2026» / "August 12, 2026"
function formatDate(value, lang) {
  const p = parts(value);
  if (!p || p.mo < 1 || p.mo > 12) return value;
  return lang === 'en' ? `${EN_MONTHS[p.mo - 1]} ${p.d}, ${p.y}` : `${p.d} ${RU_MONTHS[p.mo - 1]} ${p.y}`;
}

// «12 авг 2026» / "Aug 12, 2026" — для узких мест (кадры плёнки)
function formatDateShort(value, lang) {
  const p = parts(value);
  if (!p || p.mo < 1 || p.mo > 12) return value;
  return lang === 'en' ? `${EN_SHORT[p.mo - 1]} ${p.d}, ${p.y}` : `${p.d} ${RU_SHORT[p.mo - 1]} ${p.y}`;
}

module.exports = { formatDate, formatDateShort };
