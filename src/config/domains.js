const { domainToASCII } = require('url');

const CANONICAL_MAIN = 'levkeiser.com';
const CANONICAL_STORE = 'levkeiser.shop';
const CANONICAL_RU = 'левкейсер.рф';

// Остальные купленные домены — не отдают контент сами, а 301-редиректят
// на один из канонических выше (защита бренда/товарного знака Levkeiser от захвата).
const REDIRECT_MAP = {
  'djlevka.store': CANONICAL_STORE,
  'djlevka.online': CANONICAL_MAIN,
  'djlevka.ru': CANONICAL_MAIN,
  'djlevka.com': CANONICAL_MAIN,
  'djlevka.shop': CANONICAL_STORE,
  'levkeiser.ru': CANONICAL_MAIN,
  'levkeiser.store': CANONICAL_STORE,
  'levkeiser.online': CANONICAL_MAIN,
  'levkeyser.online': CANONICAL_MAIN,
  'levkeyser.ru': CANONICAL_MAIN,
  'levkeyser.com': CANONICAL_MAIN,
  'levkeyser.shop': CANONICAL_STORE,
  'levkeyser.store': CANONICAL_STORE,
  'левкейсер.shop': CANONICAL_STORE,
  'левкейсер.com': CANONICAL_MAIN,
};

// Домены, с которых сайт открывается сразу по-английски: DJ Levka — музыкальная
// персона с международной аудиторией, поэтому его латинские домены ведут на
// /en/… канонического сайта (кроме .ru). Лев Кейсер / Levkeiser и все
// кириллические и .ru-домены остаются русскими; английская версия у них — /en.
const EN_FIRST_DOMAINS = ['djlevka.com', 'djlevka.online', 'djlevka.store', 'djlevka.shop'];

const toAsciiHost = (host) => domainToASCII(String(host).toLowerCase());
const EN_FIRST_LOOKUP = new Set(EN_FIRST_DOMAINS.map(toAsciiHost));

const CANONICAL_STORE_ASCII = toAsciiHost(CANONICAL_STORE);
const CANONICAL_RU_ASCII = toAsciiHost(CANONICAL_RU);

const REDIRECT_LOOKUP = new Map(
  Object.entries(REDIRECT_MAP).map(([from, to]) => [toAsciiHost(from), toAsciiHost(to)])
);

module.exports = {
  toAsciiHost,
  REDIRECT_LOOKUP,
  EN_FIRST_DOMAINS,
  EN_FIRST_LOOKUP,
  CANONICAL_STORE_ASCII,
  CANONICAL_RU_ASCII,
  CANONICAL_MAIN,
  CANONICAL_STORE,
  CANONICAL_RU,
};
