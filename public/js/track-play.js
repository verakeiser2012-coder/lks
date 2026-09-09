// Прослушивание треков прямо в списке релиза. Один общий элемент audio:
// иначе два трека играют одновременно, стоит промахнуться мимо паузы.
//
// Фоновую музыку сайта на время глушим: слушать трек под другой трек нельзя,
// а после паузы возвращаем как было.
(function () {
  var rows = document.querySelectorAll('.track-row-play');
  if (!rows.length) return;

  var audio = new Audio();
  var current = null;
  var bg = document.getElementById('bg-audio');
  var bgWasPlaying = false;

  function reset() {
    document.querySelectorAll('.track-row-play').forEach(function (b) {
      b.textContent = '▶';
      b.classList.remove('is-playing');
    });
  }

  function restoreBg() {
    if (bgWasPlaying && bg && bg.paused) {
      var toggle = document.getElementById('bg-audio-toggle');
      if (toggle) toggle.click();
    }
    bgWasPlaying = false;
  }

  audio.addEventListener('ended', function () { reset(); current = null; restoreBg(); });

  rows.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-src');
      if (current === src && !audio.paused) {
        audio.pause();
        reset();
        restoreBg();
        return;
      }
      if (bg && !bg.paused) {
        bgWasPlaying = true;
        var toggle = document.getElementById('bg-audio-toggle');
        if (toggle) toggle.click();
      }
      reset();
      if (current !== src) {
        audio.src = src;
        current = src;
      }
      audio.play().then(function () {
        btn.textContent = '❚❚';
        btn.classList.add('is-playing');
      }).catch(function () { reset(); });
    });
  });
})();
