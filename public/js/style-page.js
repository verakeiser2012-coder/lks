(function () {
  // ---- Игра «Какой год?» ---------------------------------------------------
  // Варианты: правильный год плюс два соседних из тех, что есть в ленте.
  var game = document.querySelector('.walks-game');
  if (!game) return;
  var allYears = (game.getAttribute('data-years') || '').split(',').filter(Boolean);
  var walks = Array.prototype.slice.call(game.querySelectorAll('.walk[data-year]')).filter(function (w) { return w.getAttribute('data-year'); });
  var total = walks.length;
  var answered = 0;
  var hits = 0;
  var scoreEl = game.querySelector('.walks-score');

  function options(year) {
    var pool = allYears.filter(function (y) { return y !== year; });
    pool.sort(function (a, b) { return Math.abs(a - year) - Math.abs(b - year); });
    var picks = pool.slice(0, 2);
    var y = Number(year);
    while (picks.length < 2) {
      var candidate = String(y + (picks.length ? -1 : 1) * (picks.length + 1));
      if (picks.indexOf(candidate) === -1 && candidate !== year) picks.push(candidate);
    }
    picks.push(year);
    picks.sort();
    return picks;
  }

  function finish() {
    if (!scoreEl || answered < total) return;
    scoreEl.querySelector('.walks-score-hit').textContent = hits;
    scoreEl.querySelector('.walks-score-total').textContent = total;
    var note = hits === total ? 'Вы следите за мной дольше, чем я думал.'
      : hits >= total / 2 ? 'Неплохо. Подпишитесь в Telegram, там проходки выходят первыми.'
      : 'Я тоже путаю. Медленно, но расту.';
    scoreEl.querySelector('.walks-score-note').textContent = note;
    scoreEl.hidden = false;
  }

  walks.forEach(function (walk) {
    var year = walk.getAttribute('data-year');
    var box = walk.querySelector('.walk-guess-options');
    var answer = walk.querySelector('.walk-guess-answer');
    if (!box || !answer) return;
    options(year).forEach(function (y) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'walk-guess-btn';
      b.textContent = y;
      b.addEventListener('click', function () {
        if (walk.classList.contains('is-answered')) return;
        walk.classList.add('is-answered');
        var hit = y === year;
        if (hit) hits += 1;
        answered += 1;
        b.classList.add(hit ? 'is-hit' : 'is-miss');
        answer.textContent = hit ? 'Да, ' + year + '.' : 'Это ' + year + '.';
        answer.hidden = false;
        finish();
      });
      box.appendChild(b);
    });
  });
})();
