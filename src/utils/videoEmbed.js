// Распознаёт ссылку на YouTube/Rutube/VK Видео/Vimeo и возвращает embed-URL для iframe.
function parseVideoEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  let m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (m) {
    return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }

  m = trimmed.match(/rutube\.ru\/(?:video|shorts)\/([a-z0-9]+)/i);
  if (m) {
    return { provider: 'rutube', embedUrl: `https://rutube.ru/play/embed/${m[1]}` };
  }

  m = trimmed.match(/(?:vk\.com|vkvideo\.ru)\/video(-?\d+)_(\d+)/i);
  if (m) {
    return { provider: 'vk', embedUrl: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2` };
  }

  m = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i);
  if (m) {
    const embedUrl = m[2]
      ? `https://player.vimeo.com/video/${m[1]}?h=${m[2]}`
      : `https://player.vimeo.com/video/${m[1]}`;
    return { provider: 'vimeo', embedUrl };
  }

  return null;
}

module.exports = { parseVideoEmbedUrl };
