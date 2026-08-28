const crypto = require('crypto');
const db = require('../db');
const { sendHtml, isConfigured } = require('./mail');

const SITE = 'https://levkeiser.com';
const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

function unsubscribeToken(email) {
  return crypto.createHmac('sha256', SECRET).update('unsub:' + email).digest('hex').slice(0, 20);
}

function unsubscribeUrl(email) {
  return SITE + '/unsubscribe?e=' + encodeURIComponent(email) + '&t=' + unsubscribeToken(email);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmail(news, coverPath, email) {
  const url = SITE + '/news/' + news.slug;
  const unsub = unsubscribeUrl(email);
  const paragraphs = escapeHtml(news.content || '')
    .split(/\n{2,}/)
    .map((p) => '<p style="margin:0 0 14px;line-height:1.6;">' + p.replace(/\n/g, '<br>') + '</p>')
    .join('');
  const coverBlock = coverPath
    ? '<img src="' + SITE + coverPath + '" alt="" style="width:100%;max-width:560px;border-radius:8px;margin:0 0 18px;display:block;">'
    : '';
  const html = [
    '<div style="background:#F7F3EA;padding:24px 12px;font-family:Georgia,serif;color:#211A12;">',
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">',
    '<div style="background:#211A12;color:#D99A2B;padding:14px 24px;font-size:13px;letter-spacing:0.2em;">LEVKEYSER</div>',
    '<div style="padding:24px;">',
    '<h1 style="margin:0 0 6px;font-size:22px;">' + escapeHtml(news.title) + '</h1>',
    '<div style="color:#8a7a63;font-size:12px;margin-bottom:16px;">' + news.created_at.slice(0, 10) + '</div>',
    coverBlock,
    paragraphs,
    '<p style="margin:20px 0 0;"><a href="' + url + '" style="background:#B4601C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Читать на сайте</a></p>',
    '</div>',
    '<div style="padding:14px 24px;border-top:1px solid #eee;color:#8a7a63;font-size:11px;">',
    'Вы получили это письмо, потому что подписались на новости на levkeiser.com. ',
    '<a href="' + unsub + '" style="color:#8a7a63;">Отписаться</a>',
    '</div>',
    '</div></div>',
  ].join('');
  const text = news.title + '\n\n' + (news.content || '') + '\n\nЧитать: ' + url + '\nОтписаться: ' + unsub;
  return { subject: 'Новость: ' + news.title, html, text };
}

/**
 * Рассылка новости. testEmail — отправить только на этот адрес (для проверки).
 * Возвращает { sent, failed: [{email, error}] }.
 */
async function sendNewsletter(newsId, testEmail) {
  if (!isConfigured) {
    return { sent: 0, failed: [], error: 'SMTP не настроен — письма не отправлены.' };
  }
  const news = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId);
  if (!news) return { sent: 0, failed: [], error: 'Новость не найдена.' };
  const cover = db.prepare(
    "SELECT file_path FROM news_media WHERE news_id = ? AND type = 'photo' ORDER BY sort_order ASC LIMIT 1"
  ).get(news.id);
  const coverPath = cover ? cover.file_path : '';

  const targets = testEmail
    ? [{ email: testEmail }]
    : db.prepare('SELECT email FROM subscribers ORDER BY id').all();

  let sent = 0;
  const failed = [];
  for (const t of targets) {
    const msg = buildEmail(news, coverPath, t.email);
    try {
      await sendHtml({ to: t.email, subject: msg.subject, html: msg.html, text: msg.text });
      sent += 1;
    } catch (err) {
      failed.push({ email: t.email, error: err.message });
    }
  }

  if (!testEmail && sent > 0) {
    db.prepare("UPDATE news SET newsletter_sent_at = datetime('now', 'localtime') WHERE id = ?").run(news.id);
  }
  return { sent, failed };
}

module.exports = { sendNewsletter, unsubscribeToken };
