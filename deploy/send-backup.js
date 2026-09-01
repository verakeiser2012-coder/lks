// Отправляет свежий бэкап базы на почту.
// Смысл: копии на том же сервере спасают только от ошибки в данных.
// При потере сервера они исчезают вместе с ним, поэтому нужна копия снаружи.
//
// Запуск на сервере: node /var/www/site/deploy/send-backup.js
// Обычно вызывается из backup-site.sh сразу после создания копии.
require('dotenv').config({ path: '/var/www/site/.env' });

const fs = require('fs');
const path = require('path');
const nodemailer = require('/var/www/site/node_modules/nodemailer');

const BACKUP_DIR = '/root/db-backups';
const TO = process.env.BACKUP_EMAIL || process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

function newestBackup() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^shop-\d{8}-\d{4}\.db$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? path.join(BACKUP_DIR, files[0].f) : null;
}

(async () => {
  const file = newestBackup();
  if (!file) {
    console.error('Бэкапов не найдено в', BACKUP_DIR);
    process.exit(1);
  }

  const size = fs.statSync(file).size;
  // Почтовые сервисы режут вложения; при разрастании базы письмо просто не уйдёт,
  // и об этом лучше узнать из лога, чем молча потерять копию
  if (size > 20 * 1024 * 1024) {
    console.error(`Бэкап слишком большой для письма: ${(size / 1024 / 1024).toFixed(1)} МБ. Нужна выгрузка в хранилище.`);
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.yandex.ru',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  const name = path.basename(file);
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

  await transporter.sendMail({
    from: `"Сервер levkeiser.com" <${process.env.SMTP_USER}>`,
    to: TO,
    subject: `Бэкап базы ${name}`,
    text: [
      `Резервная копия базы сайта.`,
      ``,
      `Файл: ${name}`,
      `Размер: ${(size / 1024).toFixed(0)} КБ`,
      `Снят: ${stamp} UTC`,
      ``,
      `Это письмо — единственная копия за пределами сервера.`,
      `Не удалять: при потере сервера восстанавливать будем отсюда.`,
      ``,
      `Как восстановить: сохранить вложение как shop.db и положить`,
      `в /var/www/site/data/ вместо текущего файла, затем pm2 restart site.`,
    ].join('\n'),
    attachments: [{ filename: name, path: file }],
  });

  console.log(`${new Date().toISOString()} бэкап отправлен на ${TO}: ${name} (${(size / 1024).toFixed(0)} КБ)`);
})().catch((err) => {
  console.error(`${new Date().toISOString()} ОШИБКА отправки бэкапа:`, err.message);
  process.exit(1);
});
