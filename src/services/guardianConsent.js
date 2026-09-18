/**
 * Согласие родителя на участие несовершеннолетнего — общая схема для форм,
 * где публикуются имя и изображение: «Рыжие» и конкурс «Твой выход под трек».
 *
 * Три входа (решение владельца 18.09.2026): 18+ — как обычно; 14–17 — подросток
 * подаёт сам, а согласие на обработку данных и публикацию подтверждает родитель
 * по ссылке из письма (ст. 152.1 ГК — изображение несовершеннолетнего только с
 * согласия законного представителя); до 14 — заявку подаёт сам родитель, его
 * согласие в форме. Подтверждение хранится с датой и адресом.
 *
 * Страница по ссылке — с кнопками, а не действие по самому переходу: почтовые
 * сканеры открывают ссылки из писем, и согласие «подтверждалось» бы без человека.
 * Отказ удаляет заявку целиком: хранить данные ребёнка без согласия нельзя.
 */
const crypto = require('crypto');
const db = require('../db');
const { notify, sendHtml, isConfigured } = require('./mail');

const AGE_GROUPS = new Set(['adult', 'teen', 'child']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KINDS = {
  redheads: {
    table: 'redhead_submissions',
    section: 'Рыжие, которые вдохновляют',
    sectionUrl: '/redheads',
    consentPath: '/redheads/consent/',
    about: 'подборка людей с натуральным рыжим цветом волос на сайте Льва Кейсера',
    verb: 'подал(а) заявку в подборку',
    will: [
      'имя — без фамилии;',
      'фотография, которую пришлёт участник или его родитель;',
      'род занятий и пара слов о себе.',
    ],
    wont: [
      'контактов, города, школы;',
      'ссылок на соцсети несовершеннолетних — присланная ссылка останется только у нас, для просмотра;',
      'предложений от брендов напрямую ребёнку — если подборкой заинтересуется бренд для съёмки, предложение придёт вам.',
    ],
    adminUrl: '/admin/redheads/submissions',
  },
  contest: {
    table: 'contest_submissions',
    section: 'Твой выход под трек',
    sectionUrl: '/contest',
    consentPath: '/contest/consent/',
    about: 'конкурс коротких видео под музыку DJ Levka на сайте Льва Кейсера',
    verb: 'прислал(а) видео на конкурс',
    will: [
      'видео, которое участник уже выложил на своей странице, — мы можем показать его на сайте и в наших соцсетях;',
      'имя — без фамилии;',
      'если видео выиграет — об этом будет написано на сайте и в соцсетях.',
    ],
    wont: [
      'контактов, города, школы;',
      'ссылок на соцсети несовершеннолетних;',
      'прямых контактов брендов-партнёров с ребёнком — приз и любые предложения передаются через вас.',
    ],
    adminUrl: '/admin/contest/submissions',
  },
};

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Разбор полей формы про возраст. Возвращает { ok, error } либо готовые значения
 * для записи: age, guardian, guardianMail, token, confirmedAt, status.
 */
function parseAge(body) {
  const age = AGE_GROUPS.has(body.age) ? body.age : 'adult';
  const guardianName = String(body.guardianName || '').trim();
  const guardianMail = String(body.guardianContact || '').trim().toLowerCase();
  if (age !== 'adult' && !guardianName) {
    return { error: age === 'teen' ? 'Укажите имя родителя или законного представителя.' : 'Укажите своё имя как родителя.' };
  }
  if (age !== 'adult' && !EMAIL_RE.test(guardianMail)) {
    return { error: age === 'teen' ? 'Укажите почту родителя — туда придёт ссылка для подтверждения.' : 'Укажите свою почту.' };
  }
  const confirmedAt = age === 'child' ? new Date().toISOString() : null;
  return {
    age,
    guardian: age === 'adult' ? '' : guardianName,
    guardianMail: age === 'adult' ? '' : guardianMail,
    token: age === 'teen' ? makeToken() : null,
    confirmedAt,
    status: age === 'teen' ? 'pending_consent' : 'new',
  };
}

/** Письмо родителю подростка: что опубликуем, что нет, и ссылка для решения. */
function letter(kind, { name, guardianName, token, base }) {
  const k = KINDS[kind];
  const link = `${base}${k.consentPath}${token}`;
  const privacy = `${base}/legal/privacy`;
  const lines = [
    `Здравствуйте${guardianName ? ', ' + guardianName : ''}!`,
    '',
    `${name} ${k.verb} «${k.section}» на сайте levkeiser.com — это ${k.about}.`,
    'Заявителю от 14 до 17 лет, поэтому без вашего согласия мы её не рассматриваем.',
    '',
    'Если заявку примем, на сайте появятся:',
    ...k.will.map((w) => '— ' + w),
    '',
    'Чего на сайте не будет:',
    ...k.wont.map((w) => '— ' + w),
    '',
    'Подтвердить согласие на обработку данных и публикацию — по ссылке (там же можно отказать):',
    link,
    '',
    'Согласие можно отозвать в любой момент письмом на info@levkeiser.com — данные удалим.',
    `Политика обработки персональных данных: ${privacy}`,
    '',
    'Лев Кейсер, levkeiser.com',
  ];
  const text = lines.join('\n');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = lines
    .map((l) => (l === link ? `<a href="${link}">${link}</a>`
      : l.endsWith(privacy) ? esc(l).replace(privacy, `<a href="${privacy}">${privacy}</a>`)
        : esc(l)))
    .join('<br>');
  return {
    subject: `Согласие на участие ${name} — «${k.section}», levkeiser.com`,
    text,
    html: `<div style="font:15px/1.5 Georgia,serif;color:#211a12">${html}</div>`,
  };
}

/**
 * Отправить письмо родителю. Возвращает null при успехе или текст ошибки для
 * формы. Без SMTP (локальный стенд) ссылка пишется в лог, ошибки нет.
 */
async function sendLetter(kind, { name, guardianName, guardianMail, token, base }) {
  const l = letter(kind, { name, guardianName, token, base });
  try {
    await sendHtml({ to: guardianMail, subject: l.subject, html: l.html, text: l.text });
    return null;
  } catch (err) {
    console.error(`[${kind}] письмо родителю не ушло:`, err.message);
    if (!isConfigured) {
      console.log(`[${kind}] SMTP не настроен, ссылка подтверждения:`, `${base}${KINDS[kind].consentPath}${token}`);
      return null;
    }
    return 'Не удалось отправить письмо родителю. Проверьте адрес или напишите нам через форму обращения.';
  }
}

function findByToken(kind, token) {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) return null;
  return db.prepare(`SELECT * FROM ${KINDS[kind].table} WHERE consent_token = ?`).get(token) || null;
}

/** Маршруты GET/POST /consent/:token для роутера раздела. */
function mountConsentRoutes(router, kind, describe) {
  const k = KINDS[kind];
  const view = (res, state, s, code) => res.status(code || 200).render('guardian-consent', { state, s, kind: k, describe });

  router.get('/consent/:token', (req, res) => {
    const s = findByToken(kind, req.params.token);
    if (!s) return view(res, 'missing', null, 404);
    view(res, s.consent_confirmed_at ? 'already' : 'ask', s);
  });

  router.post('/consent/:token', (req, res) => {
    const s = findByToken(kind, req.params.token);
    if (!s) return view(res, 'missing', null, 404);
    if (s.consent_confirmed_at) return view(res, 'already', s);

    if (req.body.action === 'decline') {
      db.prepare(`DELETE FROM ${k.table} WHERE id = ?`).run(s.id);
      return view(res, 'declined', null);
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE ${k.table} SET consent_confirmed_at = ?, consent_ip = ?, status = 'new' WHERE id = ?`)
      .run(now, req.ip, s.id);
    notify(
      `Новая заявка — «${k.section}»: ${s.name} (14–17, согласие родителя подтверждено)`,
      `${describe(s)}\nРодитель: ${s.guardian_name}, ${s.guardian_contact}\nПодтверждено: ${now}\n\nПосмотреть: ${k.adminUrl}`
    );
    view(res, 'confirmed', s);
  });
}

module.exports = { KINDS, AGE_GROUPS, parseAge, letter, sendLetter, findByToken, mountConsentRoutes };
