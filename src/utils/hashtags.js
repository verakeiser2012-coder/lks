// Автоподбор хэштегов для постов календаря: простые правила по ключевым словам.
// База бренда — всегда; тематика — по содержанию текста.
const RULES = [
  { pattern: /музык|трек|релиз|dj|сет|микс|песн|саунд/i, tags: ['#djlevka', '#электроннаямузыка', '#музыка'] },
  { pattern: /вдохнови/i, tags: ['#вдохновение', '#левкейсер_вдохновение'] },
  { pattern: /улыбнул/i, tags: ['#улыбнуло', '#левкейсер_улыбнуло'] },
  { pattern: /рыж/i, tags: ['#рыжие'] },
  { pattern: /кино|фильм|съёмк|съемк|актёр|актер|бажов/i, tags: ['#кино'] },
  { pattern: /мод[аыеу]|модел|фотосесс|стиль|образ/i, tags: ['#мода', '#модель'] },
  { pattern: /медленно|slow in a fast/i, tags: ['#slowinafastworld'] },
  { pattern: /конкурс|розыгрыш/i, tags: ['#конкурс'] },
];

const BASE_TAGS = ['#левкейсер', '#levkeiser'];
const MAX_TAGS = 7;

function suggestHashtags(text) {
  const source = text || '';
  const result = [...BASE_TAGS];
  for (const rule of RULES) {
    if (rule.pattern.test(source)) {
      for (const tag of rule.tags) {
        if (!result.includes(tag)) result.push(tag);
      }
    }
  }
  // Не предлагаем то, что уже стоит в тексте.
  return result.filter((tag) => !source.toLowerCase().includes(tag.toLowerCase())).slice(0, MAX_TAGS);
}

module.exports = { suggestHashtags };
