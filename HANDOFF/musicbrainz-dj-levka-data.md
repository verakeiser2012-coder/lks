# MusicBrainz: DJ Levka — данные для ввода

Собрано с open.spotify.com (артист DJ Levka, ID `2Yk65GNoUclS0VKtyvCebY`) 2026-08-17, авторство
openedruf уточнено у пользователя в тот же день. Всего 10 релизов. Приватность: **нигде не указывать
настоящее имя/возраст** — только сценический псевдоним "DJ Levka", как и на самом сайте.

Статус задачи и контекст — см. `PLAN.md` в корне репо (строки про MusicBrainz/Wikidata/Apple Music for
Artists в текущем бэклоге) и `HANDOFF/memory/project_wikipedia_notability_lev.md` (полная история решения:
почему Wikipedia не сейчас, почему Wikidata проще, путь к Google Knowledge Panel).

---

## "openedruf" — решено

**openedruf — реальный соавтор только на Game Over** (artist credit "DJ Levka, openedruf", вносить как
второго исполнителя/feat.). На **Welcome** и **At The Jazz Club** копирайт "© openedruf" в Spotify — это
**ошибка дистрибьютора**: на этих двух вносить артиста и label как обычно, **DJ Levka**, не openedruf.

---

## 1. Артист

- **Имя:** DJ Levka
- **Тип:** Person
- **Пол/страна/годы:** не указывать (приватность)
- Создаётся на https://musicbrainz.org/artist/create

---

## 2. Релизы

### Ikigai
- Тип: **EP**
- Дата релиза: **2024** (точный день не найден, точность "Год")
- 5 треков, всего 10:15 (длительности сверены со Spotify 31.08.2026)
  1. The Sleepiest Beatmaker — 1:36
  2. Ikigai — 2:00
  3. Cozy Place — 2:25
  4. Bill Cipher — 2:03
  5. Fog — 2:11
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/1yEc3pvRLXDHQAq7GrkCp5

### Flowers
- Тип: **EP**
- Дата релиза: **2025-07-04**
- 5 треков, всего 13:53 (длительности сверены со Spotify 31.08.2026)
  1. Flowers — 2:34
  2. Memory — 3:43
  3. U — 2:39
  4. Riff Raff — 2:34
  5. Lullaby — 2:23
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/4vYXkOOUjrFFqvzNnS2vsw

### Soundstates
- Тип: **EP**
- Дата релиза: **2026-07-28**
- 5 треков, всего 12:55 (длительности сверены со Spotify 31.08.2026)
  1. Soundstates — 1:44
  2. d r e a m — 3:14
  3. 2AM — 2:27
  4. Cloudflute — 2:45
  5. Back to the Future — 2:45
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/2GRGRxsd6N4NtT9YFEAP1Z

### BERSERK
- Тип: **EP** (у Spotify стоит "Мини-альбом", хотя фактически 1 трек — оставляй как EP)
- Дата релиза: **2024**
- 1 трек, 1:47
  1. BERSERK
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/4OqBkoRPAkYsKux1xmb1HB

### Welcome
- Тип: **Single**
- Дата релиза: **2024**
- 1 трек, 1:38
  1. Welcome
- Label/copyright: DJ Levka (Spotify показывает "© openedruf" — ошибка дистрибьютора, не вноси её)
- Spotify: https://open.spotify.com/album/4HXklBQwdarUccRUjqpnhO

### Game Over
- Тип: **Single**
- Дата релиза: **2024**
- 1 трек, 2:12
  1. Game Over
- Artist credit: **"DJ Levka, openedruf"** — реальный соавтор, вноси как второго исполнителя/feat.
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/3vs5PA85xaBxYJvEWCjYj2

### Deep Sleep
- Тип: **Single**
- Дата релиза: **2024**
- 1 трек, 2:57
  1. Deep Sleep
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/1xESh1PEsMOF5ljhCs4op9

### At The Jazz Club
- Тип: **Single**
- Дата релиза: **2024**
- 1 трек, 2:02
  1. At The Jazz Club
- Label/copyright: DJ Levka (Spotify показывает "© openedruf" — ошибка дистрибьютора, не вноси её)
- Spotify: https://open.spotify.com/album/05MdxQ06L3JjYU6nKfLLTd

### Bubblegum
- Тип: **Single**
- Дата релиза: **2025**
- 1 трек, 2:24
  1. Bubblegum
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/39ucjSjo6YqvDKVayqtDEf

### Glitch
- Тип: **Single**
- Дата релиза: **2026**
- 1 трек, 2:51
  1. Glitch
- Label/copyright: DJ Levka
- Spotify: https://open.spotify.com/album/735Gv5gmiaGSaKbDEkRB21

---

## 3. Как вносить (пошагово)

1. **Создай аккаунт**: https://musicbrainz.org/register
2. **Создай артиста**: залогинься → https://musicbrainz.org/artist/create
   - Name: `DJ Levka`
   - Type: `Person`
   - Остальные поля (пол, страна, годы) оставь пустыми
   - Sortname можно тоже `DJ Levka`
   - Добавь Spotify как URL-связь (Relationships → Add relationship → URL → Streaming music page →
     вставь артист-ссылку `https://open.spotify.com/artist/2Yk65GNoUclS0VKtyvCebY`)
3. **Добавляй релизы** (для каждого из 10, по очереди): со страницы артиста → "Add release" (или
   https://musicbrainz.org/release/add), мастер из 5 шагов:
   - Шаг 1 (Information): Release title, Artist = DJ Levka, Type = EP/Single (см. выше), Status = Official
   - Шаг 2 (Tracklist): формат = Digital Media, впиши треки по порядку с длительностями из пакета выше
   - Шаг 3 (Recordings): обычно можно оставить автоматическое сопоставление
   - Шаг 4 (Release info): Date = дата из пакета, Barcode = none/skip, Label = DJ Levka на всех 10
     релизах (на Game Over дополнительно укажи openedruf как соавтора в artist credit — см. выше)
   - Шаг 5 (Edit note): коротко напиши "adding official release from Spotify", отправь
   - На странице готового релиза → вкладка **Relationships** → Add URL → Streaming music page →
     вставь соответствующую Spotify-ссылку из пакета
4. **Обложки (Cover Art Archive)**: после создания релиза — вкладка **Cover Art** на странице релиза →
   "Add Cover Art" → загрузи файл обложки EP/сингла. Проходит peer review, публикуется не мгновенно.

Рекомендуемый порядок ввода: сначала 3 главных EP (Ikigai, Flowers, Soundstates), потом BERSERK,
затем 6 синглов — так плотность треклистов даёт MusicBrainz больше сигнала на старте.

---

## Расхождения с базой сайта (найдено 31.08.2026)

Сверял пакет с таблицей `tracks` на сайте — совпадает не всё. Для MusicBrainz канон — Spotify
(это то, что реально доставил дистрибьютор), но на сайте стоит поправить:

| Релиз | На сайте | На Spotify | Что делать |
|---|---|---|---|
| Ikigai | трек «Nisu» | трека «Nisu» нет, вместо него **Cozy Place** | Переименовать на сайте или выяснить, откуда взялся Nisu |
| Ikigai | порядок: Ikigai, Sleepiest, Nisu, Fog, Bill Cipher | Sleepiest, Ikigai, Cozy Place, Bill Cipher, Fog | Выровнять порядок по Spotify |
| Flowers | «rif raf» | **Riff Raff** | Исправить написание |

Ни одно из расхождений не блокирует MusicBrainz — вносим по Spotify.

---

## ✅ ВНЕСЕНО 31.08.2026 — идентификаторы MusicBrainz

Артист и все 10 релизов созданы. Данные брались со Spotify, в примечаниях к каждой правке указан источник.
Приватность соблюдена: только псевдоним, без имени, возраста, пола и страны.

**Артисты:**
- DJ Levka — `626bf313-9749-4f24-9637-e20b53bb04d7`
- openedruf — `48cf2c9b-3104-460e-8426-a529f553c193` (создан, чтобы корректно указать совместный кредит на Game Over)

**Релизы:**

| Релиз | Тип | Год | MBID |
|---|---|---|---|
| Ikigai | EP | 2024 | `248803ad-605e-43d0-9b51-b080e76c5b9c` |
| BERSERK | EP | 2024 | `3f60bb37-611a-44e7-9081-6caa859fab23` |
| Flowers | EP | 2025-07-04 | `9882a955-2995-4cf8-b459-434cfd4d48f2` |
| Soundstates | EP | 2026-07-28 | `8aa3c90b-cd8c-4b0b-a681-56791bf95709` |
| Welcome | Single | 2024 | `820f6c28-593c-402f-8d4b-a146830f2f70` |
| Game Over | Single | 2024 | `f012afcc-764b-4021-8416-3eef426fb407` |
| Deep Sleep | Single | 2024 | `dafbff0c-b836-4330-bbf9-d14235064fb5` |
| At the Jazz Club | Single | 2024 | `d9cc7184-380f-437e-ac9f-b37b02905eff` |
| Bubblegum | Single | 2025 | `c043c859-be9b-4d3a-9b9f-31a400ebdfae` |
| Glitch | Single | 2026 | `1cf02089-e788-4eb0-ab1d-548e85368fa9` |

**Ссылки на артисте:** Spotify, YouTube, SoundCloud, Deezer, Apple Music.
Сайт levkeiser.com не добавлен намеренно — он ещё под паролем и отдал бы 401.

**Как вносилось (пригодится в следующий раз):** обычная форма редактора сопротивляется скриптам,
но у MusicBrainz есть штатное предзаполнение релиза — POST-форма на `/release/add` с полями вида
`name`, `artist_credit.names.0.mbid`, `mediums.0.track.N.name`, `mediums.0.track.N.length` (в миллисекундах).
Через GET оно не работает, только POST.

## Обложки — 3 из 10 загружены (31.08.2026)

| Релиз | Обложка |
|---|---|
| Ikigai | ✅ загружена |
| Flowers | ✅ загружена |
| Soundstates | ✅ загружена |
| BERSERK, Welcome, Game Over, Deep Sleep, At the Jazz Club, Bubblegum, Glitch | ⬜ осталось |

**Рабочий способ загрузки** (важно, форма не принимает файл обычным путём): обложки берутся прямо
с CDN Spotify — их отдаёт CORS, поэтому картинку можно скачать в самой странице MusicBrainz
и подложить в поле файла через `DataTransfer`. Ссылки на обложки всех альбомов берутся одним
запросом к `open.spotify.com/oembed?url=<album>`; в полученном `thumbnail_url` заменить
`ab67616d00001e02` на `ab67616d0000b273` — это версия 640px вместо 300px.

Дальше в той же странице: отметить чекбокс **Front**, заполнить примечание к правке, нажать
«Enter edit». Всё это делается скриптом, кроме одного — **сессия MusicBrainz живёт только пока
открыта панель браузера**. Если панель закрылась, нужен повторный вход, и это может сделать
только пользователь.

## Что дальше по цепочке к Knowledge Panel

1. **Обложки** — доделать оставшиеся 7 по способу выше.
2. **Wikidata** — теперь можно: идентификатор MusicBrainz засчитывается как «серьёзная публичная ссылка».
3. **Apple Music for Artists** — третий кирпич, claim профиля.
