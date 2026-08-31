const { ensureFreshToken, exchangeForLongLivedToken, saveCredentials } = require('../instagramToken');
const { absoluteMediaUrl } = require('../mediaUrl');

// Instagram API with Instagram Login (graph.instagram.com) — без Facebook-страницы.
// Токен: долгоживущий (60 дней), продлевается автоматически при публикациях.
const fields = [
  { name: 'accessToken', label: 'Токен доступа (Instagram Login, instagram_business_content_publish)', type: 'password' },
  { name: 'appSecret', label: 'Секрет приложения Meta (нужен, чтобы обменять часовой токен на 60-дневный)', type: 'password' },
  { name: 'igUserId', label: 'ID аккаунта (можно оставить пустым — определится сам)', type: 'text' },
];

const GRAPH = 'https://graph.instagram.com/v23.0';

// Вызывается админкой сразу после сохранения данных: свежий токен из Instagram Login
// живёт всего час, поэтому меняем его на долгоживущий, пока он ещё действителен.
async function onCredentialsSaved(credentials, network, previous) {
  const tokenChanged = !previous || previous.accessToken !== credentials.accessToken;
  if (!tokenChanged) return null;

  const networkKey = network && network.key;
  // Отметки продления относились к прежнему токену — обнуляем, иначе новый не будут продлевать.
  credentials.tokenRefreshedAt = '';
  credentials.tokenExpiresAt = '';
  credentials.tokenRefreshFailedAt = '';
  saveCredentials(networkKey, credentials);

  if (!credentials.accessToken || !credentials.appSecret) return null;
  await exchangeForLongLivedToken(credentials, networkKey);
  return 'Токен обменян на долгоживущий — действует 60 дней, дальше продлевается сам.';
}

async function resolveUserId(credentials, token, networkKey) {
  if (credentials.igUserId) return credentials.igUserId;
  const res = await fetch(GRAPH + '/me?fields=user_id,username&access_token=' + encodeURIComponent(token));
  const data = await res.json();
  const id = data.user_id || data.id;
  if (!id) {
    throw new Error((data.error && data.error.message) || 'Instagram не вернул ID аккаунта — проверьте токен.');
  }
  credentials.igUserId = String(id);
  saveCredentials(networkKey, credentials);
  return credentials.igUserId;
}

async function waitUntilReady(containerId, token) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(GRAPH + '/' + containerId + '?fields=status_code&access_token=' + encodeURIComponent(token));
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Instagram не смог обработать медиа.');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Instagram слишком долго обрабатывает медиа — попробуйте опубликовать позже.');
}

async function createAndPublish(igUserId, token, params) {
  params.set('access_token', token);
  const createRes = await fetch(GRAPH + '/' + igUserId + '/media', { method: 'POST', body: params });
  const created = await createRes.json();
  if (!created.id) {
    throw new Error((created.error && created.error.message) || 'Instagram отклонил медиа.');
  }

  if (params.get('media_type') !== 'IMAGE' && !params.get('image_url')) {
    await waitUntilReady(created.id, token);
  }

  const publishRes = await fetch(GRAPH + '/' + igUserId + '/media_publish', {
    method: 'POST',
    body: new URLSearchParams({ creation_id: created.id, access_token: token }),
  });
  const published = await publishRes.json();
  if (!published.id) {
    throw new Error((published.error && published.error.message) || 'Instagram не опубликовал медиа.');
  }
  return published.id;
}

async function publish(post, credentials, network) {
  if (!credentials.accessToken) throw new Error('Не указан токен Instagram.');
  if (!post.media_path) throw new Error('Instagram требует фото или видео — текстовые посты не поддерживаются.');

  const networkKey = network && network.key;
  const token = await ensureFreshToken(credentials, networkKey);
  const igUserId = await resolveUserId(credentials, token, networkKey);

  const mediaUrl = absoluteMediaUrl(post.media_path);
  const isVideo = post.media_type === 'video';
  const params = new URLSearchParams({ caption: post.text || '' });
  if (isVideo) {
    params.set('media_type', 'REELS');
    params.set('video_url', mediaUrl);
  } else {
    params.set('image_url', mediaUrl);
  }

  const mediaId = await createAndPublish(igUserId, token, params);

  const permalinkRes = await fetch(GRAPH + '/' + mediaId + '?fields=permalink&access_token=' + encodeURIComponent(token));
  const permalinkData = await permalinkRes.json();
  return { url: permalinkData.permalink || '' };
}

// История: media_type=STORIES; ссылку-стикер API не поддерживает.
async function publishStory(post, credentials, network) {
  if (!credentials.accessToken) throw new Error('Не указан токен Instagram.');
  if (!post.media_path) throw new Error('Для истории нужно фото или видео.');

  const networkKey = network && network.key;
  const token = await ensureFreshToken(credentials, networkKey);
  const igUserId = await resolveUserId(credentials, token, networkKey);

  const mediaUrl = absoluteMediaUrl(post.media_path);
  const isVideo = post.media_type === 'video';
  const params = new URLSearchParams({ media_type: 'STORIES' });
  params.set(isVideo ? 'video_url' : 'image_url', mediaUrl);

  await createAndPublish(igUserId, token, params);
}

module.exports = { key: 'instagram', label: 'Instagram', fields, publish, publishStory, onCredentialsSaved };
