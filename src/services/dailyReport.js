/**
 * Ежедневный отчёт: что нового на сайте и в соцсетях за день.
 *
 * Собирается из тех же таблиц, что и разделы админки, но одним экраном:
 * подписки, обращения, заявки брендов, рыжих и конкурса, заказы, реакции
 * (оценки в дневнике, голоса за образы, прослушивания, просмотры) и соцсети —
 * что вышло (своё и импорт с площадок), что не вышло с ошибкой, что стоит
 * на сегодня и сколько постов ждут галочки.
 *
 * День считается по местному времени (Екатеринбург, +5), а в базе все даты
 * в UTC — границы дня переводятся здесь один раз. Письмо уходит утром за
 * вчерашний день; тот же отчёт за любой день открывается в /admin/reports.
 */
const db = require('../db');
const { notify } = require('./mail');

const TZ_OFFSET_HOURS = Number(process.env.SITE_TZ_OFFSET_HOURS || 5);
const SEND_AT_HOUR = Number(process.env.DAILY_REPORT_HOUR || 9);

/** «2026-09-13» по местному времени. */
function localDay(date = new Date()) {
  return new Date(date.getTime() + TZ_OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
}

/** Границы местного дня в UTC, в формате datetime('now') базы. */
function utcRange(day) {
  const start = new Date(`${day}T00:00:00Z`).getTime() - TZ_OFFSET_HOURS * 3600000;
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  return { from: fmt(start), to: fmt(start + 86400000) };
}

const NETWORK_NAMES = {
  telegram: 'Telegram', vk: 'ВКонтакте', youtube: 'YouTube', instagram: 'Instagram', 'instagram-djlevka': 'Instagram (музыка)',
  tiktok: 'TikTok', pinterest: 'Pinterest', rutube: 'Rutube', ok: 'Одноклассники', dzen: 'Дзен', x: 'X', facebook: 'Facebook',
  soundcloud: 'SoundCloud', news: 'Новости сайта',
};
const networkName = (key) => NETWORK_NAMES[key] || key;

function collect(day) {
  const { from, to } = utcRange(day);
  const between = (col) => `${col} >= '${from}' AND ${col} < '${to}'`;
  const all = (sql) => db.prepare(sql).all();
  const count = (sql) => db.prepare(sql).get().c;

  const subscribers = all(`SELECT email, created_at FROM subscribers WHERE ${between('created_at')} ORDER BY created_at`);
  const messages = all(`SELECT id, topic, name, email, substr(body, 1, 140) AS body, is_read, created_at FROM messages WHERE ${between('created_at')} ORDER BY created_at`);
  const brands = all(`SELECT id, company_name, contact_name, wants, status, created_at FROM brand_requests WHERE ${between('created_at')} ORDER BY created_at`);
  const redheads = all(`SELECT id, name, role, status, created_at FROM redhead_submissions WHERE ${between('created_at')} ORDER BY created_at`);
  const contest = all(`SELECT id, name, video_url, status, created_at FROM contest_submissions WHERE ${between('created_at')} ORDER BY created_at`);
  const orders = all(`SELECT id, customer_name, total, status, payment_status, delivery_method, created_at FROM orders WHERE ${between('created_at')} ORDER BY created_at`);
  const ordersPaid = orders.filter((o) => o.payment_status === 'paid');

  const reactions = {
    diaryMarks: count(`SELECT COUNT(*) AS c FROM diary_marks WHERE ${between('created_at')}`),
    lookVotes: count(`SELECT COUNT(*) AS c FROM look_votes WHERE ${between('created_at')}`),
    plays: count(`SELECT COUNT(*) AS c FROM track_plays WHERE ${between('played_at')}`),
    views: db.prepare('SELECT COALESCE(SUM(hits), 0) AS c FROM page_views WHERE day = ?').get(day).c,
    topPages: db.prepare('SELECT path, hits FROM page_views WHERE day = ? ORDER BY hits DESC LIMIT 5').all(day),
  };

  // Соцсети: вышедшее за день (по времени публикации площадки), ошибки, план на день, очередь без галочки.
  const published = all(`
    SELECT t.network_key, t.published_url, p.sources, substr(p.text, 1, 90) AS text, t.updated_at
    FROM social_post_targets t JOIN social_posts p ON p.id = t.post_id
    WHERE t.status = 'published' AND ${between('t.updated_at')} ORDER BY t.updated_at`);
  const failed = all(`
    SELECT t.network_key, t.error, substr(p.text, 1, 90) AS text, p.id AS post_id
    FROM social_post_targets t JOIN social_posts p ON p.id = t.post_id
    WHERE t.status IN ('error', 'failed') AND ${between('t.updated_at')} ORDER BY t.updated_at`);
  const plannedToday = all(`
    SELECT p.id, p.scheduled_at, p.approved, substr(p.text, 1, 90) AS text,
           GROUP_CONCAT(t.network_key, ', ') AS networks
    FROM social_posts p LEFT JOIN social_post_targets t ON t.post_id = p.id
    WHERE p.status = 'scheduled' AND date(p.scheduled_at) = ? GROUP BY p.id ORDER BY p.scheduled_at`.replace('?', `'${day}'`));
  const awaitingApproval = count("SELECT COUNT(*) AS c FROM social_posts WHERE status = 'scheduled' AND approved = 0");
  const overdue = count(`SELECT COUNT(*) AS c FROM social_posts WHERE status = 'scheduled' AND approved = 0 AND scheduled_at < '${to}'`);

  const own = published.filter((p) => p.sources !== 'импорт с площадки');
  const imported = published.filter((p) => p.sources === 'импорт с площадки');
  const byNetwork = {};
  published.forEach((p) => { byNetwork[p.network_key] = (byNetwork[p.network_key] || 0) + 1; });

  const total = subscribers.length + messages.length + brands.length + redheads.length + contest.length + orders.length;
  return {
    day, generatedAt: new Date().toISOString(),
    subscribers, messages, brands, redheads, contest, orders, ordersPaid,
    ordersSum: ordersPaid.reduce((s, o) => s + Number(o.total || 0), 0),
    reactions,
    social: { published, own, imported, failed, plannedToday, awaitingApproval, overdue, byNetwork },
    quiet: total === 0 && published.length === 0 && failed.length === 0 && reactions.views === 0,
    networkName,
  };
}

/** Текст письма — то же, что на экране, но без вёрстки. */
function renderText(r) {
  const d = r.day.split('-').reverse().join('.');
  const lines = [`Отчёт за ${d}`, ''];
  const sec = (title, arr, fmt) => {
    lines.push(`${title}: ${arr.length}`);
    arr.slice(0, 10).forEach((x) => lines.push(`  • ${fmt(x)}`));
    if (arr.length > 10) lines.push(`  … и ещё ${arr.length - 10}`);
  };
  sec('Подписки', r.subscribers, (s) => s.email);
  sec('Обращения', r.messages, (m) => `${m.topic} — ${m.name} <${m.email}>: ${m.body}`);
  sec('Заявки брендов', r.brands, (b) => `${b.company_name} (${b.contact_name})`);
  sec('Заявки рыжих', r.redheads, (x) => `${x.name}${x.role ? ', ' + x.role : ''}`);
  sec('Заявки на конкурс', r.contest, (x) => `${x.name} — ${x.video_url}`);
  sec(`Заказы`, r.orders, (o) => `№${o.id} ${o.customer_name} — ${o.total} ₽, ${o.payment_status === 'paid' ? 'оплачен' : 'не оплачен'}`);
  if (r.ordersPaid.length) lines.push(`  Оплачено на ${r.ordersSum} ₽`);
  lines.push('', `Реакции: просмотров ${r.reactions.views}, прослушиваний ${r.reactions.plays}, оценок в дневнике ${r.reactions.diaryMarks}, голосов за образы ${r.reactions.lookVotes}`);
  if (r.reactions.topPages.length) lines.push('  Страницы: ' + r.reactions.topPages.map((p) => `${p.path} (${p.hits})`).join(', '));
  lines.push('', 'Соцсети');
  lines.push(`  Вышло: ${r.social.published.length} (своих ${r.social.own.length}, импорт с площадок ${r.social.imported.length})`
    + (Object.keys(r.social.byNetwork).length ? ' — ' + Object.entries(r.social.byNetwork).map(([k, n]) => `${networkName(k)} ${n}`).join(', ') : ''));
  r.social.failed.forEach((f) => lines.push(`  ✗ ${networkName(f.network_key)}: ${f.text} — ${f.error}`));
  lines.push(`  На сегодня в календаре: ${r.social.plannedToday.length}` + (r.social.plannedToday.length ? ' — ' + r.social.plannedToday.map((p) => `${p.scheduled_at.slice(11, 16)} ${p.approved ? '✓' : '⏳'} ${p.text}`).join('; ') : ''));
  lines.push(`  Ждут галочки: ${r.social.awaitingApproval}` + (r.social.overdue ? `, из них просрочено ${r.social.overdue}` : ''));
  lines.push('', 'Полный отчёт: /admin/reports?day=' + r.day);
  return lines.join('\n');
}

/** Отправить отчёт за день (по умолчанию — за вчера) на почту администратора. */
async function sendDailyReport(day) {
  const d = day || localDay(new Date(Date.now() - 86400000));
  const r = collect(d);
  const subject = r.quiet
    ? `Сайт за ${d.split('-').reverse().join('.')}: тихий день`
    : `Сайт за ${d.split('-').reverse().join('.')}: подписок ${r.subscribers.length}, обращений ${r.messages.length}, заказов ${r.orders.length}, в соцсетях ${r.social.published.length}`;
  await notify(subject, renderText(r));
  db.prepare("INSERT INTO settings (key, value) VALUES ('daily_report_last_sent', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(d);
  return r;
}

/**
 * Раз в минуту смотрим: наступило ли утро (SEND_AT_HOUR по местному) и не
 * отправлялся ли уже отчёт за вчера. Отметка в settings переживает рестарты,
 * поэтому после перезапуска сервера письмо не уходит второй раз.
 */
function schedule() {
  const tick = () => {
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'daily_report_enabled'").get();
    if (enabled && enabled.value === '0') return;
    const nowLocal = new Date(Date.now() + TZ_OFFSET_HOURS * 3600000);
    if (nowLocal.getUTCHours() < SEND_AT_HOUR) return;
    const yesterday = localDay(new Date(Date.now() - 86400000));
    const last = db.prepare("SELECT value FROM settings WHERE key = 'daily_report_last_sent'").get();
    if (last && last.value >= yesterday) return;
    sendDailyReport(yesterday).catch((e) => console.error('[отчёт дня]', e.message));
  };
  setTimeout(tick, 20000);
  setInterval(tick, 60000);
}

module.exports = { collect, renderText, sendDailyReport, schedule, localDay, networkName };
