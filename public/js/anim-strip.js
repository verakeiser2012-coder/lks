// Кинолента анимаций на странице трека. Ролики крутятся сами, без звука:
// так браузер разрешает автозапуск, а страница не орёт пятью дорожками.
// Звук включается по кнопке на одном ролике; остальные при этом глохнут,
// фоновая музыка сайта ставится на паузу и возвращается, когда звук выключили.
(function () {
  var strip = document.querySelector('.anim-strip');
  if (!strip) return;
  var cells = Array.prototype.slice.call(strip.querySelectorAll('.anim-cell'));
  var bg = document.getElementById('bg-audio');
  var bgToggle = document.getElementById('bg-audio-toggle');
  var bgWasPlaying = false;
  // Тумблер фона мы нажимаем и сами; свои нажатия слушатель ниже пропускает.
  var internalClick = false;

  function clickBg() { internalClick = true; bgToggle.click(); internalClick = false; }
  function pauseBg() {
    if (bg && !bg.paused && bgToggle) { bgWasPlaying = true; clickBg(); }
  }
  function restoreBg() {
    if (bgWasPlaying && bg && bg.paused && bgToggle) clickBg();
    bgWasPlaying = false;
  }
  function setSound(cell, on) {
    var video = cell.querySelector('video');
    var btn = cell.querySelector('.anim-sound');
    video.muted = !on;
    cell.classList.toggle('has-sound', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '🔊 звук' : '🔇 звук';
  }

  function start(video) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }

  // Лента крутится сразу, а наблюдатель только останавливает уехавшие за край:
  // если IntersectionObserver почему-то молчит, ролики всё равно идут.
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target.querySelector('video');
      if (e.isIntersecting) start(v);
      else if (!v.muted) { /* со звуком не трогаем: человек его сам включил */ }
      else v.pause();
    });
  }, { root: null, threshold: 0.2 }) : null;

  cells.forEach(function (cell) {
    var video = cell.querySelector('video');
    var btn = cell.querySelector('.anim-sound');
    video.muted = true;
    start(video);
    if (io) io.observe(cell);

    btn.addEventListener('click', function () {
      var turnOn = video.muted;
      cells.forEach(function (c) { setSound(c, false); });
      if (turnOn) {
        setSound(cell, true);
        pauseBg();
        // Ролик уже крутится, повторный play() события не даст — зовём арбитра сами.
        if (window.levkaSolo) window.levkaSolo(video);
        // Со звуком — с начала: иначе включается с середины фразы.
        video.currentTime = 0;
        start(video);
      } else {
        restoreBg();
      }
    });
  });

  // Часть браузеров не пускает автозапуск даже немого видео, пока человек
  // ничего не нажал. Тогда лента поедет с первого же касания страницы.
  setTimeout(function () {
    var stalled = cells.filter(function (c) { return c.querySelector('video').paused; });
    if (!stalled.length) return;
    function kick() {
      stalled.forEach(function (c) { start(c.querySelector('video')); });
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('touchstart', kick);
      window.removeEventListener('scroll', kick);
    }
    document.addEventListener('pointerdown', kick);
    document.addEventListener('touchstart', kick);
    window.addEventListener('scroll', kick, { passive: true });
  }, 600);

  // Ушли со страницы или включили фоновую музыку руками — звук роликов долой.
  if (bgToggle) bgToggle.addEventListener('click', function () {
    if (internalClick) return;
    cells.forEach(function (c) { setSound(c, false); });
    bgWasPlaying = false;
  });
})();
