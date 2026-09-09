// Прослушивание треков прямо в списке релиза. Один общий элемент audio:
// иначе два трека играют одновременно, стоит промахнуться мимо паузы.
//
// Фоновую музыку и остальные плееры глушит общий арбитр (js/audio-solo.js):
// этот Audio создан из кода и в DOM не попадает, поэтому регистрируем его сам.
(function () {
  var rows = document.querySelectorAll('.track-row-play');
  if (!rows.length) return;

  var audio = new Audio();
  var current = null;

  function reset() {
    document.querySelectorAll('.track-row-play').forEach(function (b) {
      b.textContent = '▶';
      b.classList.remove('is-playing');
    });
  }

  audio.addEventListener('ended', function () { reset(); current = null; });

  rows.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-src');
      if (current === src && !audio.paused) {
        audio.pause();
        reset();
        return;
      }
      if (window.levkaSolo) window.levkaSolo(audio);
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
