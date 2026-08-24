const { absoluteMediaUrl } = require('../mediaUrl');

const fields = [
  { name: 'accessToken', label: 'Long-lived токен (instagram_content_publish)', type: 'password' },
  { name: 'igUserId', label: 'Instagram Business Account ID', type: 'text' },
];

const GRAPH = 'https://graph.facebook.com/v19.0';

async function waitUntilReady(containerId, accessToken) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${accessToken}`);
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Instagram не смог обработать медиа.');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Instagram слишком долго обрабатывает медиа — попробуйте опубликовать позже.');
}

async function publish(post, credentials) {
  const { accessToken, igUserId } = credentials;
  if (!accessToken || !igUserId) throw new Error('Не указан токен или Instagram Business Account ID.');
  if (!post.media_path) throw new Error('Instagram требует фото или видео — текстовые посты не поддерживаются.');

  const mediaUrl = absoluteMediaUrl(post.media_path);
  const isVideo = post.media_type === 'video';
  const params = new URLSearchParams({ caption: post.text || '', access_token: accessToken });
  params.set(isVideo ? 'video_url' : 'image_url', mediaUrl);
  if (isVideo) params.set('media_type', 'REELS');

  const createRes = await fetch(`${GRAPH}/${igUserId}/media`, { method: 'POST', body: params });
  const created = await createRes.json();
  if (!created.id) {
    throw new Error((created.error && created.error.message) || 'Instagram отклонил медиа — проверьте, что сайт не за паролем.');
  }

  if (isVideo) await waitUntilReady(created.id, accessToken);

  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: created.id, access_token: accessToken }),
  });
  const published = await publishRes.json();
  if (!published.id) {
    throw new Error((published.error && published.error.message) || 'Instagram не опубликовал пост.');
  }

  const permalinkRes = await fetch(`${GRAPH}/${published.id}?fields=permalink&access_token=${accessToken}`);
  const permalinkData = await permalinkRes.json();

  return { url: permalinkData.permalink || '' };
}

module.exports = { key: 'instagram', label: 'Instagram', fields, publish };
