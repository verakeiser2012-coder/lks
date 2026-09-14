# Прогон каталога через Shazam

14.09.2026. Все 25 треков с сайта (`public/audio/*.mp3`) прогнаны через распознавание Shazam
(библиотека shazamio, тот же API, что у приложения) — по 5 отрезков по 20 с на трек.
Контроль: чужой трек из папки сетов (Deorro — Shake That Bottle) распознался с первого раза,
значит метод рабочий. Скрипт — в scratchpad сессии, повторить можно за 5 минут.

## Главное

Через API ни один трек DJ Levka не распознался — ни с mp3 сайта, ни с WAV-мастеров (Bubblegum,
Soundstates, Memory, отрезки 20 и 45 с). **Приложение Shazam на телефоне Bubblegum узнало (проверено 14.09)** — каталог в Shazam есть,
неофициальный API его не видит. Графа «без совпадений» ниже ничего не значит; пробела нет.

## Что Shazam «узнал» вместо нас

Shazam сверяет запись, не мелодию. Совпадение с чужим треком = один и тот же звуковой материал.
**Лев подтвердил: все лупы из Splice** — значит, это просто чужие треки на тех же лупах, юридически чисто.

| Трек | Отрезок | Shazam выдал | Что думать |
|---|---|---|---|
| **u** | 41 с, 105 с, 137 с | DJ_RAGE — FIRST KISS | общий Splice-луп |
| **BERSERK** | 4, 26, 47, 69 с | бразильские DJ-сеты (DJ GA MIX, DJ GABIRU, DJ TRALHA) | тот же Splice-луп |
| **Flowers** | 71 с, 102 с | kdemusic — Simulation | общий Splice-луп |
| **Memory** | 194 с | Pryda — Sequence One | Pryda (Eric Prydz) на том же Splice-лупе |
| **2am** | 8 / 67 / 96 с | Josef Lupo — Lumiere; Faben DBPU — MIEDO; Mondragon — Doh | три Splice-лупа |
| **Bubblegum** | 8 с | la carte — bleu de nuit | общий луп |
| **Back to the Future** | 143 с | flames music — To Night | общий луп |

Без совпадений: At The Jazz Club, Bill Cipher, Cloudflute, Cozy Place, Deep Sleep, Dream, Fog, Game Over,
Glitch, Hotline, Ikigai, Lullaby, Mystery Shack, Rif Raf, Ruins, Soundstates, Spooky Month.

**Bill Cipher, Mystery Shack, Ruins — чисто по Shazam, но это ничего не значит:** цитата мелодии,
сыгранная заново, по отпечатку записи не ловится. Для мелодий нужен Content ID (YouTube, unlisted)
или ACRCloud Cover Detection (пробный аккаунт на 14 дней, регистрирует пользователь).

## Что делать

1. AudD-бот в Telegram с 2026 только платный ($5/мес) — не вариант.
2. Лупы Splice легальны, но чужие треки на тех же лупах могут сидеть в Content ID и вешать заявки на наши
   видео — держать под рукой название паки и лицензию Splice для оспаривания. Для игр и IPEX препятствий нет.
