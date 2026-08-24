const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');

const fields = [
  { name: 'clientId', label: 'OAuth Client ID (Google Cloud Console)', type: 'text' },
  { name: 'clientSecret', label: 'OAuth Client Secret', type: 'password' },
  { name: 'refreshToken', label: 'Refresh token (получить один раз через OAuth Playground)', type: 'password' },
];

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!data.access_token) {
    throw new Error(data.error_description || 'Не удалось обновить токен YouTube.');
  }
  return data.access_token;
}

async function publish(post, credentials) {
  const { clientId, clientSecret, refreshToken } = credentials;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Не указаны OAuth-данные YouTube.');
  }
  if (post.media_type !== 'video' || !post.media_path) {
    throw new Error('YouTube принимает только видео.');
  }

  const accessToken = await getAccessToken(credentials);
  const filePath = path.join(uploadsDir, path.basename(post.media_path));
  const fileBuffer = fs.readFileSync(filePath);

  const metadata = {
    snippet: { title: (post.text || 'DJ Levka').slice(0, 100), description: post.text || '' },
    status: { privacyStatus: 'public' },
  };

  const initResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': String(fileBuffer.length),
      },
      body: JSON.stringify(metadata),
    }
  );
  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) {
    const err = await initResponse.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || 'YouTube не выдал ссылку на загрузку.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/*', 'Content-Length': String(fileBuffer.length) },
    body: fileBuffer,
  });
  const result = await uploadResponse.json();
  if (!result.id) {
    throw new Error((result.error && result.error.message) || 'YouTube не подтвердил загрузку.');
  }

  return { url: `https://youtu.be/${result.id}` };
}

module.exports = { key: 'youtube', label: 'YouTube', fields, publish };
