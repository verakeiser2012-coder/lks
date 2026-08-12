const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');
const API_VERSION = '5.199';

const fields = [
  { name: 'accessToken', label: 'Токен доступа (права wall, photos)', type: 'password' },
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

async function publish(post, credentials) {
  const { accessToken, groupId } = credentials;
  if (!accessToken || !groupId) {
    throw new Error('Не указан токен доступа или ID группы.');
  }
  if (post.media_type === 'video') {
    throw new Error('Публикация видео в VK пока не поддерживается — используйте текст или фото.');
  }

  let attachments = '';
  if (post.media_path) {
    const filePath = path.join(uploadsDir, path.basename(post.media_path));
    attachments = await uploadPhoto(groupId, accessToken, filePath);
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

module.exports = { key: 'vk', label: 'VK', fields, publish };
