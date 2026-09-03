function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Один проход, две формы записи: размеченная [текст](url) и просто
// написанный адрес. Порядок важен — разметка идёт первой, иначе адрес
// внутри неё был бы съеден как голый и ссылка развалилась бы.
const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;

// Точка в конце предложения к адресу не относится: без этого
// «пишите на https://band.link/djlevka.» вело бы на битую ссылку.
const TRAILING = /[.,;:!?)»"']+$/;

// Экранирует HTML и превращает ссылки в <a>: и размеченные [текст](url),
// и просто написанные адреса — их пишут в текстах чаще всего, а кликнуть
// по ним было нельзя.
function renderLinkedText(text) {
  if (!text) return '';
  return escapeHtml(text).replace(LINK_PATTERN, (match, label, url, bare) => {
    if (bare) {
      const tail = (bare.match(TRAILING) || [''])[0];
      const clean = tail ? bare.slice(0, -tail.length) : bare;
      return `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>${tail}`;
    }
    const attrs = url.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${url}"${attrs}>${label}</a>`;
  });
}

// Русское склонение существительного при числе: plural(3, ['релиз', 'релиза', 'релизов']) → 'релиза'.
function plural(count, forms) {
  const n = Math.abs(Number(count)) % 100;
  if (n > 10 && n < 20) return forms[2];
  const last = n % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

module.exports = { renderLinkedText, plural };
