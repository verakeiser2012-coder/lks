(function () {
  // «Угадай трек по пяти секундам». Всё на клиенте: счёт нигде не хранится,
  // кроме этой страницы. Фоновый плеер на время игры ставим на паузу.
  var root = document.getElementById('guess-game');
  if (!root) return;
  var tracks;
  try { tracks = JSON.parse(root.getAttribute('data-tracks')); } catch (e) { return; }
  if (!tracks || tracks.length < 4) return;

  var ROUNDS = Math.min(5, tracks.length);
  var SNIPPET_MS = 5000;
  var audio = new Audio();
  audio.preload = 'auto';
  var bg = document.getElementById('bg-audio');

  var card = root.querySelector('.game-card');
  var final = root.querySelector('.game-final');
  var playBtn = root.querySelector('.game-play');
  var options = root.querySelector('.game-options');
  var verdict = root.querySelector('.game-verdict');
  var nextBtn = root.querySelector('.game-next');
  var roundNum = root.querySelector('.game-round-num');
  root.querySelector('.game-round-total').textContent = ROUNDS;
  root.querySelector('.game-score-total').textContent = ROUNDS;

  var order, round, hits, current, offset, stopTimer, answered;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function start() {
    order = shuffle(tracks.slice()).slice(0, ROUNDS);
    round = 0; hits = 0;
    final.hidden = true; card.hidden = false;
    setup();
  }

  function setup() {
    current = order[round];
    answered = false;
    offset = null;
    roundNum.textContent = round + 1;
    verdict.textContent = '';
    nextBtn.hidden = true;
    playBtn.disabled = false;
    playBtn.textContent = '▶ Слушать пять секунд';
    audio.src = current.src;
    audio.load();
    var pool = shuffle(tracks.filter(function (t) { return t.src !== current.src; })).slice(0, 3);
    var variants = shuffle(pool.concat([current]));
    options.innerHTML = '';
    variants.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'game-option';
      b.textContent = t.title;
      b.addEventListener('click', function () { answer(t, b); });
      options.appendChild(b);
    });
  }

  function playSnippet() {
    if (bg && !bg.paused) bg.pause();
    clearTimeout(stopTimer);
    var go = function () {
      if (offset === null) {
        var d = isFinite(audio.duration) ? audio.duration : 60;
        var max = Math.max(d - 15, 10);
        offset = 10 + Math.random() * (max - 10);
      }
      audio.currentTime = offset;
      audio.play().then(function () {
        playBtn.textContent = '…играет';
        stopTimer = setTimeout(function () {
          audio.pause();
          playBtn.textContent = '↻ Ещё раз';
        }, SNIPPET_MS);
      }).catch(function () { playBtn.textContent = '▶ Слушать пять секунд'; });
    };
    if (audio.readyState >= 1) go();
    else audio.addEventListener('loadedmetadata', go, { once: true });
  }

  function answer(t, btn) {
    if (answered) return;
    answered = true;
    clearTimeout(stopTimer);
    audio.pause();
    var hit = t.src === current.src;
    if (hit) hits += 1;
    Array.prototype.forEach.call(options.children, function (b) {
      b.disabled = true;
      if (b.textContent === current.title) b.classList.add('is-hit');
    });
    if (!hit) btn.classList.add('is-miss');
    verdict.innerHTML = (hit ? 'Да. ' : 'Нет, это ') + '<a href="' + current.url + '">' + current.title + '</a>.';
    nextBtn.hidden = false;
    nextBtn.textContent = round + 1 < ROUNDS ? 'Дальше →' : 'Итог →';
  }

  function finish() {
    card.hidden = true;
    final.hidden = false;
    root.querySelector('.game-score-hit').textContent = hits;
    var note = hits === ROUNDS ? 'Все. Ты слушаешь внимательнее, чем я свожу.'
      : hits >= ROUNDS / 2 ? 'Больше половины. Остальные два дослушай целиком.'
      : 'Мало. Значит, есть что послушать впервые.';
    root.querySelector('.game-score-note').textContent = note;
    var url = 'https://levkeiser.com/music/guess';
    var text = 'Угадал ' + hits + ' из ' + ROUNDS + ' треков DJ Levka по пяти секундам. Попробуй:';
    root.querySelector('[data-share="tg"]').href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
    root.querySelector('[data-share="vk"]').href = 'https://vk.com/share.php?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(text);
  }

  playBtn.addEventListener('click', playSnippet);
  nextBtn.addEventListener('click', function () {
    round += 1;
    if (round < ROUNDS) setup(); else finish();
  });
  root.querySelector('.game-again').addEventListener('click', start);
  window.addEventListener('pagehide', function () { audio.pause(); });

  start();
})();
