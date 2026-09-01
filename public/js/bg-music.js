(function () {
  var STORAGE_KEY = 'levkaBgMusicOff';
  // Что играло и на какой секунде. Сайт многостраничный: при переходе элемент
  // audio уничтожается вместе со страницей, и без этого музыка каждый раз
  // начиналась бы заново с первого трека.
  var POS_KEY = 'levkaBgMusicPos';
  var VOLUME = 0.22;
  var SAVE_EVERY_MS = 2000;

  var audio = document.getElementById('bg-audio');
  var toggle = document.getElementById('bg-audio-toggle');
  if (!audio || !toggle) return;

  var ticker = document.getElementById('music-ticker');
  // Плейлист собирается из самой бегущей строки — один источник правды.
  // Файлы лежат в public/audio, добавили mp3 — он появился и в строке, и здесь.
  var items = ticker ? Array.prototype.slice.call(ticker.querySelectorAll('.music-ticker__item')) : [];
  var playlist = [];
  items.forEach(function (el) {
    var src = el.getAttribute('data-src');
    if (src && playlist.indexOf(src) === -1) playlist.push(src);
  });
  if (!playlist.length) {
    playlist = [
      '/audio/soundstates.mp3',
      '/audio/2am.mp3',
      '/audio/back-to-the-future.mp3',
      '/audio/cloudflute.mp3',
      '/audio/dream.mp3',
    ];
  }

  audio.volume = VOLUME;

  function loadPosition() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      var idx = playlist.indexOf(saved.src);
      if (idx === -1) return null;
      return { index: idx, time: Number(saved.time) || 0 };
    } catch (e) {
      return null;
    }
  }

  function savePosition() {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        src: playlist[trackIndex],
        time: audio.currentTime || 0,
      }));
    } catch (e) { /* приватный режим — просто не запоминаем */ }
  }

  var restored = loadPosition();
  var trackIndex = restored ? restored.index : 0;
  audio.src = playlist[trackIndex];
  if (restored && restored.time > 0) {
    // Перемотать можно только когда браузер узнал длительность
    audio.addEventListener('loadedmetadata', function seek() {
      audio.removeEventListener('loadedmetadata', seek);
      if (restored.time < audio.duration - 1) audio.currentTime = restored.time;
    });
  }

  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastSave > SAVE_EVERY_MS) {
      lastSave = now;
      savePosition();
    }
  });
  // Уход со страницы — записать точку, иначе потеряем до двух секунд
  window.addEventListener('pagehide', savePosition);

  function markCurrent() {
    var src = playlist[trackIndex];
    items.forEach(function (el) {
      el.classList.toggle('is-current', el.getAttribute('data-src') === src && !audio.paused);
    });
  }

  audio.addEventListener('ended', function () {
    trackIndex = (trackIndex + 1) % playlist.length;
    audio.src = playlist[trackIndex];
    savePosition();
    play();
  });

  function setState(playing) {
    toggle.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggle.setAttribute('aria-label', playing ? 'Выключить музыку' : 'Включить музыку');
    markCurrent();
  }

  function play() {
    var p = audio.play();
    if (p && p.catch) {
      p.then(function () { setState(true); }).catch(function () { setState(false); });
    } else {
      setState(true);
    }
  }

  function pause() {
    audio.pause();
    setState(false);
  }

  // Клик по названию в строке — включить именно этот трек.
  // Это же снимает запрет браузера на автозапуск: клик считается действием пользователя.
  items.forEach(function (el) {
    el.addEventListener('click', function () {
      var src = el.getAttribute('data-src');
      var idx = playlist.indexOf(src);
      if (idx === -1) return;

      if (idx === trackIndex && !audio.paused) {
        localStorage.setItem(STORAGE_KEY, '1');
        pause();
        return;
      }
      trackIndex = idx;
      audio.src = src;
      localStorage.removeItem(STORAGE_KEY);
      savePosition();
      play();
    });
  });

  var userDisabled = localStorage.getItem(STORAGE_KEY) === '1';
  if (!userDisabled) {
    play();
  } else {
    setState(false);
  }

  toggle.addEventListener('click', function () {
    if (audio.paused) {
      localStorage.removeItem(STORAGE_KEY);
      play();
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      pause();
    }
  });

  var pausedByVisibility = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!audio.paused) {
        pausedByVisibility = true;
        pause();
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      play();
    }
  });
})();
