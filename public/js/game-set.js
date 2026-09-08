(function () {
  // ---- Сборка сета: три трека в порядке нажатия -----------------------------
  var builder = document.getElementById('set-builder');
  if (builder) {
    var picked = [];
    var buttons = Array.prototype.slice.call(builder.querySelectorAll('.set-track'));
    var count = builder.querySelector('.set-count');
    var go = builder.querySelector('.set-go');

    function render() {
      buttons.forEach(function (b) {
        var i = picked.indexOf(b.getAttribute('data-slug'));
        b.classList.toggle('is-picked', i !== -1);
        b.querySelector('.set-track-order').textContent = i === -1 ? '' : String(i + 1);
        b.disabled = i === -1 && picked.length >= 3;
      });
      count.textContent = picked.length;
      if (picked.length === 3) {
        go.href = '/music/set/' + picked.join('.');
        go.removeAttribute('aria-disabled');
      } else {
        go.href = '#';
        go.setAttribute('aria-disabled', 'true');
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var slug = b.getAttribute('data-slug');
        var i = picked.indexOf(slug);
        if (i !== -1) picked.splice(i, 1);
        else if (picked.length < 3) picked.push(slug);
        render();
      });
    });
    go.addEventListener('click', function (e) {
      if (go.getAttribute('aria-disabled') === 'true') e.preventDefault();
    });
    render();
  }

  // ---- Прослушивание сета: три файла подряд --------------------------------
  var view = document.getElementById('set-view');
  if (view) {
    var audio = document.getElementById('set-audio');
    var items = Array.prototype.slice.call(view.querySelectorAll('.set-item'));
    var playBtn = view.querySelector('.set-play');
    var bg = document.getElementById('bg-audio');
    var idx = -1;

    function mark() {
      items.forEach(function (li, i) {
        li.classList.toggle('is-playing', i === idx && !audio.paused);
        li.querySelector('.set-item-state').textContent = i === idx && !audio.paused ? '▶' : '';
      });
      playBtn.textContent = audio.paused ? (idx === -1 ? '▶ Слушать сет' : '▶ Продолжить') : '❚❚ Пауза';
    }

    function playIndex(i) {
      if (i >= items.length) { idx = -1; audio.pause(); mark(); return; }
      idx = i;
      audio.src = items[i].getAttribute('data-src');
      audio.play().then(mark).catch(mark);
    }

    playBtn.addEventListener('click', function () {
      if (bg && !bg.paused) bg.pause();
      if (!audio.paused) { audio.pause(); mark(); return; }
      if (idx === -1) playIndex(0);
      else audio.play().then(mark).catch(mark);
    });
    items.forEach(function (li, i) {
      li.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        if (bg && !bg.paused) bg.pause();
        playIndex(i);
      });
    });
    audio.addEventListener('ended', function () { playIndex(idx + 1); });
    audio.addEventListener('pause', mark);
    audio.addEventListener('play', mark);
    window.addEventListener('pagehide', function () { audio.pause(); });
  }
})();
