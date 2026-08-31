const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');
const API_VERSION = '5.199';

const fields = [
  { name: 'accessToken', label: 'Токен доступа (права wall, photos, video)', type: 'password' },
  { name: 'groupId', label: 'ID группы (число, без минуса)', type: 'text' },
];

async function vkCall(method, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { method: 'POST' });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.error_msg || 'VK API вернул ошибку.');
  }
  return data.response;
}

async function uploadPhoto(groupId, accessToken, filePath) {
  const server = await vkCall('photos.getWallUploadServer', {
    group_id: groupId,
    access_token: accessToken,
    v: API_VERSION,
  });

  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('photo', new Blob([fileBuffer]), path.basename(filePath));
  const uploadResponse = await fetch(server.upload_url, { method: 'POST', body: form });
  const uploadResult = await uploadResponse.json();

  const saved = await vkCall('photos.saveWallPhoto', {
    group_id: groupId,
    access_token: accessToken,
    v: API_VERSION,
    photo: uploadResult.photo,
    server: uploadResult.server,
    hash: uploadResult.hash,
  });

  const photo = saved[0];
  return `photo${photo.owner_id}_${photo.id}`;
}

// Видео в сообществе: video.save отдаёт адрес для загрузки файла, вложение готово сразу после неё.
// Вертикальный ролик VK сам показывает в Клипах.
async function uploadVideo(groupId, accessToken, filePath, name, description) {
  const saved = await vkCall('video.save', {
    group_id: Math.abs(Number(groupId)),
    access_token: accessToken,
    v: API_VERSION,
    name: (name || 'Видео').slice(0, 128),
    description: description || '',
    wallpost: 0,
  });

  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('video_file', new Blob([fileBuffer]), path.basename(filePath));
  const uploadResponse = await fetch(saved.upload_url, { method: 'POST', body: form });
  const uploadResult = await uploadResponse.json();
  if (uploadResult.error) {
    throw new Error(uploadResult.error_descr || uploadResult.error || 'VK не принял видеофайл.');
  }

  const ownerId = saved.owner_id !== undefined ? saved.owner_id : -Math.abs(Number(groupId));
  const videoId = saved.video_id !== undefined ? saved.video_id : uploadResult.video_id;
  if (videoId === undefined) {
    throw new Error('VK не вернул идентификатор загруженного видео.');
  }
  return `video${ownerId}_${videoId}`;
}

async function publish(post, credentials) {
  const { accessToken, groupId } = credentials;
  if (!accessToken || !groupId) {
    throw new Error('Не указан токен доступа или ID группы.');
  }
  let attachments = '';
  if (post.media_path) {
    const filePath = path.join(uploadsDir, path.basename(post.media_path));
    if (post.media_type === 'video') {
      // Заголовок ролика — первая строка подписи: в списке видео сообщества он виден вместо имени файла.
      const title = (post.text || '').split(/\r?\n/)[0].trim();
      attachments = await uploadVideo(groupId, accessToken, filePath, title, post.text || '');
    } else {
      attachments = await uploadPhoto(groupId, accessToken, filePath);
    }
  }

  const params = {
    owner_id: -Math.abs(Number(groupId)),
    from_group: 1,
    message: post.text || '',
    access_token: accessToken,
    v: API_VERSION,
  };
  if (attachments) params.attachments = attachments;

  const result = await vkCall('wall.post', params);
  const url = `https://vk.com/wall-${Math.abs(Number(groupId))}_${result.post_id}`;
  return { url };
}

async function getStats(target, credentials) {
  const { accessToken, groupId } = credentials;
  if (!accessToken || !groupId || !target.published_url) return null;

  const idMatch = target.published_url.match(/_(\d+)$/);
  if (!idMatch) return null;
  const ownerId = -Math.abs(Number(groupId));
  const posts = `${ownerId}_${idMatch[1]}`;

  const result = await vkCall('wall.getById', { posts, access_token: accessToken, v: API_VERSION });
  const post = result && result[0];
  if (!post) return null;

  return {
    likes: post.likes ? post.likes.count : 0,
    reposts: post.reposts ? post.reposts.count : 0,
    comments: post.comments ? post.comments.count : 0,
    views: post.views ? post.views.count : 0,
  };
}

// История сообщества (фото или видео) с кнопкой-ссылкой, если указана.
async function publishStory(post, credentials) {
  const { accessToken, groupId } = credentials;
  if (!accessToken || !groupId) {
    throw new Error('Не указан токен доступа или ID группы.');
  }
  if (!post.media_path) {
    throw new Error('Для истории нужно фото или видео.');
  }

  const isVideo = post.media_type === 'video';
  const serverParams = {
    add_to_news: 1,
    group_id: Math.abs(Number(groupId)),
    access_token: accessToken,
    v: API_VERSION,
  };
  const link = (post.link_url || '').trim();
  if (link) {
    serverParams.link_text = 'go_to';
    serverParams.link_url = link;
  }

  const server = await vkCall(isVideo ? 'stories.getVideoUploadServer' : 'stories.getPhotoUploadServer', serverParams);

  const filePath = path.join(uploadsDir, path.basename(post.media_path));
  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append(isVideo ? 'video_file' : 'file', new Blob([fileBuffer]), path.basename(filePath));
  const uploadResponse = await fetch(server.upload_url, { method: 'POST', body: form });
  const uploadResult = await uploadResponse.json();

  const uploadResultToken =
    (uploadResult.response && uploadResult.response.upload_result) || uploadResult.upload_result;
  if (!uploadResultToken) {
    throw new Error(
      (uploadResult.error && (uploadResult.error.error_msg || uploadResult.error)) ||
        'VK не принял файл истории.'
    );
  }

  await vkCall('stories.save', {
    upload_results: uploadResultToken,
    access_token: accessToken,
    v: API_VERSION,
  });
}

module.exports = { key: 'vk', label: 'VK', fields, publish, publishStory, getStats };
