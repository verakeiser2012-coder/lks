// Девиз в шапке печатается по букве. Медленно — нарочно: это фраза
// про медленность, и торопить её было бы глупо.
//
// Печатается на каждой странице заново — так решено: это подпись сайта,
// а не одноразовый эффект. Кому движение мешает (prefers-reduced-motion),
// показываем текст сразу.
(function () {
  var el = document.querySelector('[data-typewriter]');
  if (!el) return;

  var text = el.textContent;
  var line = el.closest('.logo-motto');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Без анимации фраза уже на месте — стрелка нужна сразу.
  if (reduce) { if (line) line.classList.add('is-done'); return; }

  var DELAY_MS = 320;   // одна буква — фраза набирается около десяти секунд
  var START_MS = 1000;   // пауза перед первой буквой — курсор успевает мигнуть

  el.textContent = '';
  var i = 0;
  function tick() {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, DELAY_MS);
    else if (line) line.classList.add('is-done');
  }
  setTimeout(tick, START_MS);
})();
