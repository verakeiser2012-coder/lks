// Определение площадки по ссылке на публикацию.
//
// Нужно, чтобы записать в календарь пост, который опубликовали руками:
// человек вставляет ссылку, а площадку выбирать не должен — она видна
// из адреса, и лишний выбор здесь только повод ошибиться.

const HOSTS = [
  [/(^|\.)t\.me$|(^|\.)telegram\.me$/, 'telegram'],
  [/(^|\.)vk\.com$|(^|\.)vk\.ru$/, 'vk'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)dzen\.ru$|(^|\.)zen\.yandex\.ru$/, 'dzen'],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)rutube\.ru$/, 'rutube'],
  [/(^|\.)ok\.ru$|(^|\.)odnoklassniki\.ru$/, 'ok'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest'],
  [/(^|\.)soundcloud\.com$/, 'soundcloud'],
  [/(^|\.)yappy\.media$/, 'yappy'],
  [/(^|\.)likee\.video$/, 'likee'],
  [/(^|\.)bandcamp\.com$/, 'bandcamp'],
];

/**
 * Ключ площадки по ссылке или null, если адрес не разобран.
 * Разбор нестрогий: ссылку копируют из адресной строки как есть,
 * с мобильными поддоменами (m.vk.com) и без протокола.
 */
function detectNetwork(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  let host;
  try {
    host = new URL(raw.includes('://') ? raw : 'https://' + raw).hostname.toLowerCase();
  } catch (err) {
    return null;
  }
  host = host.replace(/^(www|m|mobile|l)\./, '');
  for (const [re, key] of HOSTS) {
    if (re.test(host)) return key;
  }
  return null;
}

module.exports = { detectNetwork };
