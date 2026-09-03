const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || SMTP_USER;

const isConfigured = Boolean(SMTP_USER && SMTP_PASSWORD && NOTIFY_EMAIL);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    // Без явных таймаутов nodemailer ждёт молчащий сервер две минуты.
    // Столько не должен ждать никто: ни покупатель, ни вебхук банка.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

/**
 * Отправить уведомление на почту. Пока SMTP_USER/SMTP_PASSWORD не заданы
 * в .env, просто пишет в консоль вместо реальной отправки.
 */
async function notify(subject, text, to) {
  if (!isConfigured) {
    console.log(`[mail:mock] -> ${to || NOTIFY_EMAIL}\n${subject}\n${text}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Сайт Льва Кейсера" <${SMTP_USER}>`,
      to: to || NOTIFY_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error('[mail] Не удалось отправить уведомление:', err.message);
  }
}

/**
 * Отправка HTML-письма. В отличие от notify() НЕ глотает ошибки —
 * рассылке важно знать, что доставка не удалась.
 */
async function sendHtml({ to, subject, html, text }) {
  if (!isConfigured) {
    throw new Error('SMTP не настроен (SMTP_USER/SMTP_PASSWORD в .env).');
  }
  return transporter.sendMail({
    from: `"Лев Кейсер" <${SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}

module.exports = { notify, sendHtml, isConfigured };
