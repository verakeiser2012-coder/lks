// Статистика аудитории для медиакита и страницы «Брендам».
//
// Единственный источник с полом и возрастом — ВКонтакте: список участников
// сообщества снят через API сообщества (groups.getMembers с полями sex, bdate,
// city) 07.09.2026. Telegram и Instagram отдают только число подписчиков:
// у бота Telegram нет доступа к демографии канала, Instagram не подключён.
//
// Обновлять руками после следующего съёма. Дата обязательна: бренд проверит.

const audience = {
  snapshotDate: '7 сентября 2026',

  // Подписчики по площадкам, без учёта пересечений.
  platforms: [
    { name: 'Instagram @levkeiser', count: 1733, note: 'личный' },
    { name: 'Telegram', count: 1510, note: 'охват поста ~1 250' },
    { name: 'VK', count: 509, note: 'есть пол и возраст' },
    { name: 'Дзен', count: 468, note: '' },
    { name: 'Instagram @djlevka', count: 402, note: 'музыкальный' },
  ],

  // ВКонтакте: 509 участников, пол указан у всех, возраст — у 383 (75%).
  vk: {
    members: 509,
    withAge: 383,
    sex: [
      { label: 'Мужчины', count: 281, share: 55 },
      { label: 'Женщины', count: 228, share: 45 },
    ],
    // Доли считаются от тех, у кого указан год рождения.
    age: [
      { label: 'до 18', count: 8, share: 2 },
      { label: '18–24', count: 28, share: 7 },
      { label: '25–34', count: 88, share: 23 },
      { label: '35–44', count: 108, share: 28 },
      { label: '45+', count: 151, share: 39 },
    ],
    cities: [
      { label: 'Москва', count: 155, share: 30 },
      { label: 'Санкт-Петербург', count: 66, share: 13 },
      { label: 'Екатеринбург', count: 29, share: 6 },
      { label: 'Другие города', count: 197, share: 39 },
    ],
  },

  // Женщины 25–44 в ВК: 88 человек из 383 с указанным возрастом.
  womenCore: { label: 'Женщины 25–44', count: 88, share: 23 },
};

module.exports = audience;
