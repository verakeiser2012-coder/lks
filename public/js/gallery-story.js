// Режим «История» — лента без плёнки по образцу Embla Carousel (пример «Scale» +
// плагин Autoplay): кадры в ряд, тот, что в центре, в полный рост и с подписью,
// соседи плавно меньше и бледнее — размер и прозрачность считаются от расстояния до
// центра на каждом шаге прокрутки, а не переключаются рывком. Кадры едут сами; секунды
// на кадр задаёт зритель (по умолчанию 1 с, помнится в браузере). Пауза — кнопка,
// наведение мыши, палец на ленте, вкладка в фоне, лента за экраном, «меньше движения».
(function () {
  var KEY_SEC = 'levkaStorySeconds';
  var DEF_SEC = 1, MIN_SEC = 1, MAX_SEC = 15;
  var LAST_EXTRA = 1000;   // мс сверху на последнем кадре перед кругом
  var SCALE_MIN = 0.72;    // соседи в самом малом виде — 72 % от кадра в центре
  var FADE_MIN = 0.4;      // и на 40 % прозрачности
  var REACH = 1.1;         // на каком расстоянии (в ширинах кадра) сосед доходит до минимума

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readSeconds() {
    var v = DEF_SEC;
    try { v = parseInt(localStorage.getItem(KEY_SEC), 10); } catch (e) {}
    if (!(v >= MIN_SEC && v <= MAX_SEC)) v = DEF_SEC;
    return v;
  }

  document.querySelectorAll('.story[data-story-viewer]').forEach(function (viewer) {
    var strip = viewer.previousElementSibling;
    if (!strip || !strip.matches('.filmstrip[data-story]')) return;

    var vp = viewer.querySelector('.story__viewport');
    var cells = Array.prototype.slice.call(viewer.querySelectorAll('.story__cell'));
    var inners = cells.map(function (c) { return c.querySelector('.story__inner'); });
    var caps = cells.map(function (c) { return c.querySelector('.story__caption'); });
    var spacers = viewer.querySelectorAll('.story__spacer');
    var segs = Array.prototype.slice.call(viewer.querySelectorAll('.story__seg'));
    var playBtn = viewer.querySelector('.story__play');
    var cur = viewer.querySelector('.story__cur');
    var secVal = viewer.querySelector('.story__speed-val');
    if (!vp || cells.length < 2) return;

    var idx = 0;
    var playing = !reduced;
    var seconds = readSeconds();
    var timer = null;
    var startedAt = 0;
    var progress = 0;       // 0..1 на текущем кадре
    var holdUntil = 0;      // пауза от зрителя: не крутим до этого времени
    var offscreen = false;
    var active = false;     // режим включён (у ленты класс filmstrip--story)

    function dwellMs() { return seconds * 1000 + (idx === cells.length - 1 ? LAST_EXTRA : 0); }
    function center(cell) { return cell.offsetLeft + cell.offsetWidth / 2; }

    // Пустые края в полэкрана: первый и последний кадр тоже встают в центр.
    function layout() {
      var half = Math.round(vp.clientWidth / 2);
      spacers.forEach(function (s) { s.style.flexBasis = half + 'px'; });
    }

    // Размер и прозрачность каждого кадра от его расстояния до центра ленты. Считаем прямо
    // в обработчике scroll (он и так приходит раз в кадр), без requestAnimationFrame:
    // в фоновой вкладке rAF не вызывается, и лента бы вернулась из фона с застывшими размерами.
    function tween() {
      var mid = vp.scrollLeft + vp.clientWidth / 2;
      cells.forEach(function (c, k) {
        var d = Math.abs(center(c) - mid) / (c.offsetWidth * REACH);
        var t = 1 - Math.min(1, d);              // 1 в центре, 0 на расстоянии REACH
        var e = t * t * (3 - 2 * t);             // мягче у краёв
        inners[k].style.transform = 'scale(' + (SCALE_MIN + (1 - SCALE_MIN) * e).toFixed(4) + ')';
        inners[k].style.opacity = (FADE_MIN + (1 - FADE_MIN) * e).toFixed(3);
        if (caps[k]) caps[k].style.opacity = Math.min(1, Math.max(0, (t - 0.5) / 0.4)).toFixed(3); // подпись только у центрального
      });
    }

    function nearest() {
      var mid = vp.scrollLeft + vp.clientWidth / 2;
      var best = 0, bestD = Infinity;
      cells.forEach(function (c, k) { var d = Math.abs(center(c) - mid); if (d < bestD) { bestD = d; best = k; } });
      return best;
    }

    function mark(i) {
      idx = i;
      segs.forEach(function (s, k) {
        s.classList.toggle('is-done', k < idx);
        s.classList.toggle('is-on', k === idx);
        var bar = s.firstElementChild; if (bar) bar.style.transform = k < idx ? 'none' : 'scaleX(0)';
      });
      cells.forEach(function (c, k) {
        c.classList.toggle('is-on', k === idx);
        var v = c.querySelector('video');
        if (v) { if (k === idx) { v.play && v.play().catch(function () {}); } else { v.pause && v.pause(); } }
      });
      if (cur) cur.textContent = idx + 1;
      startedAt = performance.now(); progress = 0;
      // следующие кадры подгружаем заранее, чтобы к приезду были на месте
      for (var k = 1; k <= 2; k++) { var img = cells[(idx + k) % cells.length].querySelector('img[loading="lazy"]'); if (img) img.loading = 'eager'; }
    }

    // Подвезти кадр в центр.
    function goTo(i, instant) {
      i = (i + cells.length) % cells.length;
      var left = Math.max(0, Math.round(center(cells[i]) - vp.clientWidth / 2));
      vp.scrollTo({ left: left, behavior: instant || reduced ? 'auto' : 'smooth' });
      mark(i);
    }

    function applySeconds(v) {
      seconds = Math.min(MAX_SEC, Math.max(MIN_SEC, v));
      if (secVal) secVal.textContent = seconds;
      viewer.querySelectorAll('.story__speed-btn').forEach(function (b) {
        var d = parseInt(b.getAttribute('data-delta'), 10);
        b.disabled = seconds + d < MIN_SEC || seconds + d > MAX_SEC;
      });
      try { localStorage.setItem(KEY_SEC, String(seconds)); } catch (e) {}
      startedAt = performance.now(); progress = 0;
    }

    // setInterval, а не requestAnimationFrame: rAF в фоновой вкладке не вызывается,
    // и после возврата лента бы «прыгала». document.hidden ниже всё равно держит паузу.
    function tick() {
      if (!active) return;
      tween(); // и по таймеру тоже: scroll не приходит, пока вкладка в фоне или картинка ещё грузится
      var now = performance.now();
      var running = playing && now >= holdUntil && !offscreen && !document.hidden;
      if (running) {
        progress = Math.min(1, (now - startedAt) / dwellMs());
        var bar = segs[idx] && segs[idx].firstElementChild;
        if (bar) bar.style.transform = 'scaleX(' + progress + ')';
        if (progress >= 1) goTo(idx + 1);
      } else {
        // на паузе полоса замирает, а старт сдвигается, чтобы после паузы не прыгнуть вперёд
        startedAt = now - progress * dwellMs();
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

    function nudge(step) { holdUntil = performance.now() + 700; goTo(idx + step); }

    // Прокрутка: пересчитать размеры, а когда лента остановилась — какой кадр в центре
    // (после колеса, пальца или перетаскивания).
    var settle = null;
    vp.addEventListener('scroll', function () {
      if (!active) return;
      tween();
      clearTimeout(settle);
      settle = setTimeout(function () { var n = nearest(); if (n !== idx) mark(n); }, 100);
    }, { passive: true });

    // Мышь на ленте — стоим (как stopOnMouseEnter у Embla); ушла — через секунду едем.
    vp.addEventListener('mouseenter', function () { holdUntil = Infinity; });
    vp.addEventListener('mouseleave', function () { holdUntil = performance.now() + 1000; });
    vp.addEventListener('touchstart', function () { holdUntil = Infinity; }, { passive: true });
    vp.addEventListener('touchend', function () { holdUntil = performance.now() + 3000; }, { passive: true });
    vp.addEventListener('wheel', function () { holdUntil = performance.now() + 3000; }, { passive: true });

    // Мышью ленту можно тянуть, как пальцем; короткий клик по кадру — подвезти его в центр.
    var drag = null;
    vp.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest('a, iframe, button')) return;
      drag = { x: e.clientX, left: vp.scrollLeft, moved: false, t: performance.now() };
      vp.classList.add('is-dragging');
    });
    vp.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) vp.scrollLeft = drag.left - dx;
    });
    function endDrag(e) {
      if (!drag) return;
      var d = drag; drag = null;
      vp.classList.remove('is-dragging');
      holdUntil = performance.now() + 1500;
      if (d.moved) { goTo(nearest()); return; }
      var cell = e.target && e.target.closest && e.target.closest('.story__cell');
      if (cell) goTo(cells.indexOf(cell));
    }
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    vp.addEventListener('pointerleave', function (e) { if (drag) endDrag(e); });
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    if (playBtn) playBtn.addEventListener('click', function () { setPlaying(!playing); holdUntil = 0; });
    var prev = viewer.querySelector('.story__prev'), next = viewer.querySelector('.story__next');
    if (prev) prev.addEventListener('click', function () { nudge(-1); });
    if (next) next.addEventListener('click', function () { nudge(1); });
    viewer.querySelectorAll('.story__speed-btn').forEach(function (b) {
      b.addEventListener('click', function () { applySeconds(seconds + parseInt(b.getAttribute('data-delta'), 10)); });
    });

    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); holdUntil = 0; }
    });

    function enter() {
      if (active) return;
      active = true;
      viewer.hidden = false;
      layout();
      setPlaying(!reduced);
      applySeconds(seconds);
      goTo(idx, true);
      tween();
      timer = setInterval(tick, 60);
    }
    function leave() {
      if (!active) return;
      active = false;
      viewer.hidden = true;
      clearInterval(timer);
      cells.forEach(function (c) { var v = c.querySelector('video'); if (v && v.pause) v.pause(); });
    }

    function sync() { strip.classList.contains('filmstrip--story') ? enter() : leave(); }
    document.addEventListener('gallery:view', sync);
    sync();

    // Картинки догружаются и меняют ширину кадров — пересчитать центр и размеры.
    cells.forEach(function (c) { var img = c.querySelector('img'); if (img && !img.complete) img.addEventListener('load', function () { if (active) { goTo(idx, true); tween(); } }); });
    window.addEventListener('resize', function () { if (active) { layout(); goTo(idx, true); tween(); } });

    // Крутим только то, что на экране.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { offscreen = !en.isIntersecting; });
      }, { threshold: 0.35 }).observe(vp);
    }
  });
})();
