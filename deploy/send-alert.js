// Короткое служебное письмо о состоянии сервера.
// Вызывается из healthcheck.sh: node send-alert.js "<тема>" "<текст>"
require('dotenv').config({ path: '/var/www/site/.env' });

const nodemailer = require('/var/www/site/node_modules/nodemailer');

const TO = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
const subject = process.argv[2] || 'сообщение с сервера';
const body = process.argv[3] || '';

(async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.yandex.ru',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"Сервер levkeiser.com" <${process.env.SMTP_USER}>`,
    to: TO,
    subject: `levkeiser.com — ${subject}`,
    text: [body, '', `Время: ${new Date().toISOString()} UTC`, 'Сервер: 5.42.118.236'].join('\n'),
  });

  console.log(`${new Date().toISOString()} письмо отправлено: ${subject}`);
})().catch((err) => {
  console.error('Не удалось отправить письмо:', err.message);
  process.exit(1);
});
