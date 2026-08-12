function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

// Экранирует HTML и превращает разметку [текст](url) в ссылку <a>.
function renderLinkedText(text) {
  if (!text) return '';
  return escapeHtml(text).replace(LINK_PATTERN, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
  });
}

module.exports = { renderLinkedText };
