// Антиспам для публичных форм: honeypot-поле + ограничение частоты по IP.
// Боты заполняют скрытое поле "website" — таких тихо "принимаем" без сохранения.

const buckets = new Map();

function clientIp(req) {
  return req.headers['x-real-ip'] || req.ip || 'unknown';
}

/** true, если запрос похож на бота (honeypot заполнен). */
function isBot(req) {
  return Boolean((req.body && req.body.website || '').trim());
}

/**
 * Лимит: не больше max отправок формы name с одного IP за windowMs.
 * Возвращает true, если лимит превышен.
 */
function overLimit(name, req, max = 5, windowMs = 10 * 60 * 1000) {
  const key = name + ':' + clientIp(req);
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now - v.start > windowMs) buckets.delete(k);
    }
  }
  return b.count > max;
}

module.exports = { isBot, overLimit };
