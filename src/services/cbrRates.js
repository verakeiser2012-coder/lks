// Курс ЦБ РФ на сегодня — для ориентира «≈ €10» на английской странице услуг.
// Платим только в рублях, эквивалент справочный. Кэш 12 часов; если ЦБ не
// ответил — эквивалента на странице просто нет, цена в рублях остаётся.
const https = require('https');

const URL = 'https://www.cbr.ru/scripts/XML_daily.asp';
const TTL = 12 * 3600 * 1000;
let cache = { at: 0, rates: null };

function load() {
  return new Promise((resolve) => {
    const req = https.get(URL, { timeout: 5000, headers: { 'User-Agent': 'levkeiser.com' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        // XML в windows-1251, но нужны только коды валют и числа — latin1 хватает.
        const xml = Buffer.concat(chunks).toString('latin1');
        const rates = {};
        const re = /<CharCode>([A-Z]{3})<\/CharCode>\s*<Nominal>(\d+)<\/Nominal>\s*<Name>[^<]*<\/Name>\s*<Value>([\d,]+)<\/Value>/g;
        for (const m of xml.matchAll(re)) {
          rates[m[1]] = parseFloat(m[3].replace(',', '.')) / Number(m[2]);
        }
        resolve(rates.EUR ? rates : null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/** Курсы { EUR: 98.5, USD: 90.1, … } — рублей за единицу валюты; null, если ЦБ недоступен. */
async function rates() {
  if (cache.rates && Date.now() - cache.at < TTL) return cache.rates;
  const fresh = await load();
  if (fresh) cache = { at: Date.now(), rates: fresh };
  else cache.at = Date.now() - TTL + 3600 * 1000; // не ответил — повторим через час
  return cache.rates;
}

module.exports = { rates };
