const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || GMAIL_USER;

const isConfigured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD && NOTIFY_EMAIL);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

/**
 * Отправить уведомление на почту. Пока GMAIL_USER/GMAIL_APP_PASSWORD не заданы
 * в .env, просто пишет в консоль вместо реальной отправки.
 */
async function notify(subject, text) {
  if (!isConfigured) {
    console.log(`[mail:mock] ${subject}\n${text}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Сайт" <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error('[mail] Не удалось отправить уведомление:', err.message);
  }
}

module.exports = { notify, isConfigured };
