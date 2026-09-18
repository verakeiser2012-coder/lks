// Режим «История» для киноленты: кадр в точке увеличения (центр ленты) растёт и
// «оживает», под ним раскрывается подпись, лента едет сама. Останавливается,
// когда пользователь трогает ленту, уводит вкладку в фон или просит меньше движения.
(function () {
  var DWELL = 4200;      // мс на кадр
  var END_PAUSE = 2200;  // пауза на последнем кадре перед кругом

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.filmstrip[data-story]').forEach(function (strip) {
    var section = strip.closest('.link-section');
    var bar = section && section.querySelector('.story-bar');
    var cells = Array.prototype.slice.call(strip.querySelectorAll('.film-cell'));
    if (!bar || cells.length < 2) return;

    var playBtn = bar.querySelector('.story-bar__play');
    var fill = bar.querySelector('.story-bar__fill');
    var cur = bar.querySelector('.story-bar__cur');
    var idx = 0;
    var playing = !reduced;
    var timer = null;
    var startedAt = 0;
    var holdUntil = 0;     // пауза от пользователя (наведение/касание): не крутим до этого времени
    var active = false;    // режим включён (класс filmstrip--story)

    function cellCenter(cell) {
      return cell.offsetLeft + cell.offsetWidth / 2;
    }

    // Прокрутить так, чтобы кадр встал в точку увеличения.
    function goTo(i, instant) {
      idx = (i + cells.length) % cells.length;
      var target = cellCenter(cells[idx]) - strip.clientWidth / 2;
      strip.scrollTo({ left: Math.max(0, target), behavior: instant ? 'auto' : 'smooth' });
      cells.forEach(function (c, k) { c.classList.toggle('is-focus', k === idx); });
      if (cur) cur.textContent = idx + 1;
      startedAt = performance.now();
      progress = 0;
      if (fill) fill.style.transform = 'scaleX(0)';
    }

    var progress = 0; // 0..1, сколько прошло на текущем кадре
    // setInterval, а не requestAnimationFrame: rAF в фоновой вкладке не вызывается вовсе,
    // и после возврата лента бы «прыгала». Интервал в фоне лишь замедляется, а
    // document.hidden ниже всё равно держит паузу.
    function tick() {
      if (!active) return;
      var now = performance.now();
      var dwell = idx === cells.length - 1 ? DWELL + END_PAUSE : DWELL;
      var held = now < holdUntil;
      if (playing && !held && !document.hidden) {
        progress = Math.min(1, (now - startedAt) / dwell);
        if (fill) fill.style.transform = 'scaleX(' + progress + ')';
        if (progress >= 1) goTo(idx + 1);
      } else {
        // на паузе полоса замирает, а старт сдвигается, чтобы после паузы не прыгнуть вперёд
        startedAt = now - progress * dwell;
      }
    }

    function setPlaying(v) {
      playing = v;
      if (playBtn) {
        playBtn.textContent = v ? '❚❚' : '▶';
        playBtn.setAttribute('aria-label', v ? 'Пауза' : 'Смотреть');
        playBtn.dataset.playing = v ? '1' : '0';
      }
    }

    // Какой кадр ближе к центру — после ручной прокрутки колесом или пальцем.
    function nearest() {
      var mid = strip.scrollLeft + strip.clientWidth / 2;
      var best = 0, bestD = Infinity;
      cells.forEach(function (c, k) { var d = Math.abs(cellCenter(c) - mid); if (d < bestD) { bestD = d; best = k; } });
      return best;
    }

    var scrollDebounce = null;
    strip.addEventListener('scroll', function () {
      if (!active) return;
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(function () {
        var n = nearest();
        if (n !== idx) { idx = n; cells.forEach(function (c, k) { c.classList.toggle('is-focus', k === idx); }); if (cur) cur.textContent = idx + 1; startedAt = performance.now(); }
      }, 120);
    }, { passive: true });

    // Пользователь рядом — не дёргаем ленту. Мышь ушла — через секунду едем дальше.
    strip.addEventListener('mouseenter', function () { holdUntil = Infinity; });
    strip.addEventListener('mouseleave', function () { holdUntil = performance.now() + 1000; });
    strip.addEventListener('touchstart', function () { holdUntil = performance.now() + 6000; }, { passive: true });
    strip.addEventListener('wheel', function () { holdUntil = performance.now() + 4000; }, { passive: true });

    // Клик по кадру — сразу к нему.
    cells.forEach(function (c, k) {
      c.addEventListener('click', function (e) {
        if (!active) return;
        if (e.target.closest('a, iframe')) return;
        holdUntil = performance.now() + 1500;
        goTo(k);
      });
    });

    if (playBtn) playBtn.addEventListener('click', function () { setPlaying(!playing); holdUntil = 0; });
    bar.querySelector('.story-bar__prev').addEventListener('click', function () { holdUntil = performance.now() + 1500; goTo(idx - 1); });
    bar.querySelector('.story-bar__next').addEventListener('click', function () { holdUntil = performance.now() + 1500; goTo(idx + 1); });

    strip.addEventListener('keydown', function (e) {
      if (!active) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    });
    strip.tabIndex = 0;

    function enter() {
      if (active) return;
      active = true;
      bar.hidden = false;
      setPlaying(!reduced);
      goTo(0, true);
      timer = setInterval(tick, 80);
    }
    function leave() {
      if (!active) return;
      active = false;
      bar.hidden = true;
      clearInterval(timer);
      cells.forEach(function (c) { c.classList.remove('is-focus'); });
      if (fill) fill.style.transform = 'scaleX(0)';
    }

    function sync() { strip.classList.contains('filmstrip--story') ? enter() : leave(); }
    document.addEventListener('gallery:view', sync);
    sync();

    // Стартуем прокрутку только когда лента на экране: незачем крутить то, что не видно.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { holdUntil = en.isIntersecting ? 0 : Infinity; });
      }, { threshold: 0.4 }).observe(strip);
    }
  });
})();
