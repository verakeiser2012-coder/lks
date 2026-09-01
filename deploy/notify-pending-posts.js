// Письмо о постах, которые ждут подтверждения.
// Причина существования: подтверждение вручную мы сделали намеренно, но у него
// оказалась цена — если подтверждать некому, система молчит и не жалуется.
// Пятьдесят один пост простоял так до 02.09.2026.
//
// Запуск на сервере: node /var/www/site/deploy/notify-pending-posts.js
// В cron — раз в сутки утром.
require('dotenv').config({ path: '/var/www/site/.env' });

const db = require('/var/www/site/src/db');
const nodemailer = require('/var/www/site/node_modules/nodemailer');

const TO = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
const SITE = 'https://levkeiser.com';
const HORIZON_DAYS = 7;

function ruDate(value) {
  const d = String(value).slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}.${d[1]}` : String(value);
}

(async () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const until = new Date(now.getTime() + HORIZON_DAYS * 864e5).toISOString().slice(0, 10);

  const rows = db
    .prepare(`
      SELECT id, scheduled_at, news_hook, substr(text, 1, 90) AS preview
      FROM social_posts
      WHERE approved = 0 AND status <> 'published'
      ORDER BY scheduled_at
    `)
    .all();

  const overdue = rows.filter((r) => r.scheduled_at.slice(0, 10) < today);
  const soon = rows.filter((r) => {
    const d = r.scheduled_at.slice(0, 10);
    return d >= today && d <= until;
  });

  // Молчим, когда всё в порядке: письмо, которое приходит каждый день,
  // перестают читать через неделю
  if (!overdue.length && !soon.length) {
    console.log(`${new Date().toISOString()} подтверждать нечего, письмо не отправлено`);
    return;
  }

  const line = (r) =>
    `  ${ruDate(r.scheduled_at)}  ${(r.news_hook || r.preview || '').replace(/\s+/g, ' ').slice(0, 70)}`;

  const body = [
    'Посты в календаре ждут подтверждения. Без него они не выходят.',
    '',
  ];

  if (overdue.length) {
    body.push(`ПРОСРОЧЕНЫ — ${overdue.length} шт. Дата прошла, пост не опубликован:`);
    body.push(...overdue.slice(0, 15).map(line));
    if (overdue.length > 15) body.push(`  …и ещё ${overdue.length - 15}`);
    body.push('');
    body.push('По ним нужно либо сдвинуть дату, либо подтвердить, либо снять.');
    body.push('');
  }

  if (soon.length) {
    body.push(`БЛИЖАЙШИЕ ${HORIZON_DAYS} дней — ${soon.length} шт.:`);
    body.push(...soon.slice(0, 15).map(line));
    if (soon.length > 15) body.push(`  …и ещё ${soon.length - 15}`);
    body.push('');
  }

  body.push(`Всего ждёт подтверждения: ${rows.length}`);
  body.push('');
  body.push(`Календарь: ${SITE}/admin/calendar`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.yandex.ru',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  const subject = overdue.length
    ? `Календарь: ${overdue.length} просрочено, ${soon.length} на неделе`
    : `Календарь: ${soon.length} постов ждут подтверждения`;

  await transporter.sendMail({
    from: `"Календарь levkeiser.com" <${process.env.SMTP_USER}>`,
    to: TO,
    subject,
    text: body.join('\n'),
  });

  console.log(`${new Date().toISOString()} письмо отправлено на ${TO}: просрочено ${overdue.length}, скоро ${soon.length}`);
})().catch((err) => {
  console.error(`${new Date().toISOString()} ОШИБКА:`, err.message);
  process.exit(1);
});
