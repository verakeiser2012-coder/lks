// Девиз в шапке печатается по букве. Медленно — нарочно: это фраза
// про медленность, и торопить её было бы глупо.
//
// Печатаем один раз за визит. На каждой странице заново — через пять секунд
// это начало бы раздражать; дальше девиз просто стоит, а курсор мигает.
// Кому движение мешает (prefers-reduced-motion), показываем текст сразу.
(function () {
  var el = document.querySelector('[data-typewriter]');
  if (!el) return;

  var text = el.textContent;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var already = false;
  try { already = sessionStorage.getItem('motto-typed') === '1'; } catch (e) {}
  if (reduce || already) return;

  var DELAY_MS = 150;   // одна буква
  var START_MS = 700;   // пауза перед первой буквой — курсор успевает мигнуть

  el.textContent = '';
  var i = 0;
  function tick() {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) {
      setTimeout(tick, DELAY_MS);
    } else {
      try { sessionStorage.setItem('motto-typed', '1'); } catch (e) {}
    }
  }
  setTimeout(tick, START_MS);
})();
