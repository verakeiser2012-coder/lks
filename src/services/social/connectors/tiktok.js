const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');

const fields = [
  { name: 'accessToken', label: 'Access token (video.publish scope)', type: 'password' },
];

async function publish(post, credentials) {
  const { accessToken } = credentials;
  if (!accessToken) throw new Error('Не указан токен TikTok.');
  if (post.media_type !== 'video' || !post.media_path) {
    throw new Error('TikTok принимает только видео.');
  }

  const filePath = path.join(uploadsDir, path.basename(post.media_path));
  const fileBuffer = fs.readFileSync(filePath);

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_info: { title: post.text || '', privacy_level: 'PUBLIC_TO_EVERYONE' },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileBuffer.length,
        chunk_size: fileBuffer.length,
        total_chunk_count: 1,
      },
    }),
  });
  const initData = await initRes.json();
  const uploadUrl = initData.data && initData.data.upload_url;
  if (!uploadUrl) {
    const message = initData.error && initData.error.message;
    throw new Error(message || 'TikTok отклонил загрузку — возможен геоблок для аккаунтов, привязанных к РФ.');
  }

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${fileBuffer.length - 1}/${fileBuffer.length}`,
    },
    body: fileBuffer,
  });

  // TikTok обрабатывает видео асинхронно — прямой публичной ссылки на этом шаге ещё нет.
  return { url: '' };
}

module.exports = { key: 'tiktok', label: 'TikTok', fields, publish };
