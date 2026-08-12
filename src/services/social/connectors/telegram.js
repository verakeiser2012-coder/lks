const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');

const fields = [
  { name: 'botToken', label: 'Токен бота (от @BotFather)', type: 'password' },
  { name: 'chatId', label: 'ID канала (@username или -100...)', type: 'text' },
];

async function publish(post, credentials) {
  const { botToken, chatId } = credentials;
  if (!botToken || !chatId) {
    throw new Error('Не указан токен бота или ID канала.');
  }

  const base = `https://api.telegram.org/bot${botToken}`;
  let response;

  if (post.media_path) {
    const filePath = path.join(uploadsDir, path.basename(post.media_path));
    const fileBuffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', post.text || '');
    const field = post.media_type === 'video' ? 'video' : 'photo';
    const method = post.media_type === 'video' ? 'sendVideo' : 'sendPhoto';
    form.append(field, new Blob([fileBuffer]), path.basename(filePath));
    response = await fetch(`${base}/${method}`, { method: 'POST', body: form });
  } else {
    response = await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: post.text || '' }),
    });
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || 'Telegram API вернул ошибку.');
  }

  const messageId = data.result.message_id;
  const chatUsername = typeof chatId === 'string' && chatId.startsWith('@') ? chatId.slice(1) : null;
  const url = chatUsername ? `https://t.me/${chatUsername}/${messageId}` : '';
  return { url };
}

module.exports = { key: 'telegram', label: 'Telegram', fields, publish };
