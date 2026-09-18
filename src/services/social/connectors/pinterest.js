const { absoluteMediaUrl } = require('../mediaUrl');

const fields = [
  { name: 'accessToken', label: 'Access token (Pinterest API v5)', type: 'password' },
  { name: 'boardId', label: 'ID доски', type: 'text' },
];

async function publish(post, credentials) {
  const { accessToken, boardId } = credentials;
  if (!accessToken || !boardId) throw new Error('Не указан токен или ID доски.');
  if (!post.media_path || post.media_type !== 'photo') {
    throw new Error('Этот коннектор Pinterest поддерживает только фото.');
  }

  const body = {
    board_id: boardId,
    title: (post.text || '').slice(0, 100),
    description: post.text || '',
    media_source: { source_type: 'image_url', url: absoluteMediaUrl(post.media_path) },
  };

  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.id) {
    throw new Error(data.message || 'Pinterest отклонил пин — проверьте, что сайт не за паролем.');
  }

  return { url: `https://www.pinterest.com/pin/${data.id}/` };
}

module.exports = { key: 'pinterest', label: 'Pinterest', fields, publish };
