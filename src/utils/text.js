function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;

// Экранирует HTML и превращает разметку [текст](url) в ссылку <a>.
// Поддерживает внешние (http://...) и внутренние (/путь) ссылки.
function renderLinkedText(text) {
  if (!text) return '';
  return escapeHtml(text).replace(LINK_PATTERN, (match, label, url) => {
    const isExternal = url.startsWith('http');
    const attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
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
