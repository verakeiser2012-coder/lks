# Прогон каталога через Shazam

14.09.2026. Все 25 треков с сайта (`public/audio/*.mp3`) прогнаны через распознавание Shazam
(библиотека shazamio, тот же API, что у приложения) — по 5 отрезков по 20 с на трек.
Контроль: чужой трек из папки сетов (Deorro — Shake That Bottle) распознался с первого раза,
значит метод рабочий. Скрипт — в scratchpad сессии, повторить можно за 5 минут.

## Главное

**Ни один трек DJ Levka Shazam не знает.** Ни Bubblegum, ни Soundstates, ни Glitch — ничего
из 10 релизов. Sundesire, судя по всему, не поставляет в Shazam (у DistroKid/TuneCore/Amuse
Shazam стоит отдельной витриной). Для игр это прямо больно: игрок услышал трек в уровне
Geometry Dash или в кафе, шазамнул — пусто. Проверить у Our Angels, отдают ли они в Shazam;
если да — ещё один довод за перевыпуск.

## Что Shazam «узнал» вместо нас

Shazam сверяет запись, не мелодию. Совпадение с чужим треком в нескольких местах = один и тот же
звуковой материал: общий луп/сэмпл (Splice) или прямой сэмпл. Льву проверить по каждому, откуда взят
фрагмент.

| Трек | Отрезок | Shazam выдал | Что думать |
|---|---|---|---|
| **u** | 41 с, 105 с, 137 с | DJ_RAGE — FIRST KISS | три попадания — общий луп почти наверняка |
| **BERSERK** | 4, 26, 47, 69 с | бразильские DJ-сеты (DJ GA MIX, DJ GABIRU, DJ TRALHA) | тот же brazilian-phonk-луп во всех сетах; сам луп, видимо, из паки |
| **Flowers** | 71 с, 102 с | kdemusic — Simulation | общий сэмпл |
| **Memory** | 194 с | Pryda — Sequence One | **проверить обязательно**: Pryda = Eric Prydz, если это сэмпл из его трека, а не общий луп — в игры и на IPEX не отдавать |
| **2am** | 8 / 67 / 96 с | Josef Lupo — Lumiere; Faben DBPU — MIEDO; Mondragon — Doh | три разных чужих трека в трёх местах — типичные Splice-лупы |
| **Bubblegum** | 8 с | la carte — bleu de nuit | одно попадание, скорее общий сэмпл |
| **Back to the Future** | 143 с | flames music — To Night | одно попадание |

Без совпадений: At The Jazz Club, Bill Cipher, Cloudflute, Cozy Place, Deep Sleep, Dream, Fog, Game Over,
Glitch, Hotline, Ikigai, Lullaby, Mystery Shack, Rif Raf, Ruins, Soundstates, Spooky Month.

**Bill Cipher, Mystery Shack, Ruins — чисто по Shazam, но это ничего не значит:** цитата мелодии,
сыгранная заново, по отпечатку записи не ловится. Для мелодий нужен Content ID (YouTube, unlisted)
или ACRCloud Cover Detection (пробный аккаунт на 14 дней, регистрирует пользователь).

## Что делать

1. Лев смотрит u, BERSERK, Flowers, Memory, 2am: из какой паки лупы. Splice/Loopmasters — можно,
   вырезано из чужого трека — нельзя.
2. Memory (Pryda) — в приоритете.
3. Общие лупы легальны, но чужие треки с тем же лупом могут сидеть в Content ID и вешать заявки на наши
   видео — держать под рукой ссылку на паку/лицензию Splice для оспаривания.
4. Спросить Our Angels про Shazam.
