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

module.exports = { renderLinkedText };
