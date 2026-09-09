const express = require('express');
const db = require('../db');
const { getBanners } = require('../utils/banners');

const router = express.Router();

/**
 * Отдельная витрина игр. Сами игры живут в /music и остаются там же: игра
 * про треки на странице музыки на месте. Здесь только вход для тех, кто
 * пришёл играть, а не слушать, — и место, куда добавлять новые.
 *
 * Список описан здесь, а не в базе: игр немного, каждая это отдельная
 * страница с кодом, и заводить их через админку всё равно нельзя.
 */
const GAMES = [
  {
    url: '/music/guess',
    kicker: 'Пять секунд',
    title: 'Угадай трек',
    note: 'Пять секунд трека и четыре названия. Пять раундов, счёт в конце.',
    where: 'Музыка',
    ready: true,
  },
  {
    url: '/music/quiz',
    kicker: 'Тест',
    title: 'Какой ты трек Soundstates',
    note: 'Пять вопросов, и альбом отвечает, какой ты трек. Результат можно отправить друзьям.',
    where: 'Музыка',
    ready: true,
  },
  {
    url: '/music/set',
    kicker: 'Конструктор',
    title: 'Собери сет',
    note: 'Три трека в своём порядке, одной ссылкой. Теперь собранное можно и послушать.',
    where: 'Музыка',
    ready: true,
  },
  {
    url: '/style#walks',
    kicker: 'Архив',
    title: 'Какой год?',
    note: 'Кадр из архива с пяти лет до сейчас — угадайте, сколько Льву на фотографии.',
    where: 'Стиль',
    ready: true,
  },
];

router.get('/', (req, res) => {
  res.render('games', {
    games: GAMES,
    banners: getBanners('games'),
    title: 'Поиграть',
    pageDescription: 'Игры вокруг музыки и архива DJ Levka: угадать трек, собрать сет, узнать свой трек из альбома.',
  });
});

module.exports = router;
