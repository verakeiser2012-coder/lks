// Один звук за раз на всей странице.
//
// Источников звука несколько: фоновая музыка из бегущей строки (#bg-audio),
// плеер трека на его странице, кнопки ▶ в списке релиза и анимации со звуком.
// Каждый из них глушил соседей по-своему, и пара «строка + страница трека»
// в итоге играла хором. Здесь одно общее правило: как только что-то
// заиграло — всё остальное молчит.
//
// Фон останавливаем не напрямую, а нажатием на его тумблер: иначе кнопка
// в шапке остаётся в положении «играет», и выключить музыку нечем.
(function () {
  var extra = []; // элементы Audio, созданные из кода и не попавшие в DOM

  function bgToggle() { return document.getElementById('bg-audio-toggle'); }

  function silence(except) {
    var all = Array.prototype.slice.call(document.querySelectorAll('audio, video')).concat(extra);
    all.forEach(function (el) {
      if (el === except || el.paused) return;
      // Немой ролик (кинолента анимаций) никому не мешает — пусть крутится.
      if (el.tagName === 'VIDEO' && el.muted) return;
      if (el.id === 'bg-audio') {
        var t = bgToggle();
        if (t) t.click(); else el.pause();
        return;
      }
      el.pause();
    });
  }

  // Событие play не всплывает, поэтому слушаем на этапе перехвата.
  document.addEventListener('play', function (e) {
    if (e.target && e.target.tagName && /^(AUDIO|VIDEO)$/.test(e.target.tagName)) silence(e.target);
  }, true);

  // Для звука, созданного в коде: track-play.js и anim-strip.js зовут это сами.
  window.levkaSolo = function (el) {
    if (el && extra.indexOf(el) === -1) {
      extra.push(el);
      el.addEventListener('play', function () { silence(el); });
    }
    silence(el);
  };
})();
