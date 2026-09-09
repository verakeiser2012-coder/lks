// Оценки записей дневника. Идентификатор устройства тот же, что у голосов за
// образы: без регистрации, но и без накрутки по F5.
(function () {
  var box = document.querySelector('.diary-marks');
  if (!box) return;
  var slug = box.getAttribute('data-slug');
  var VOTER_KEY = 'levkaVoter';
  var MARK_KEY = 'levkaDiaryMarks';

  function voterId() {
    try {
      var id = localStorage.getItem(VOTER_KEY);
      if (!id) {
        id = 'v-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
        localStorage.setItem(VOTER_KEY, id);
      }
      return id;
    } catch (e) {
      return 'v-' + Math.random().toString(36).slice(2, 10);
    }
  }

  function readMine() {
    try { return JSON.parse(localStorage.getItem(MARK_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMine(mark) {
    try {
      var all = readMine();
      all[slug] = mark;
      localStorage.setItem(MARK_KEY, JSON.stringify(all));
    } catch (e) { /* приватный режим — просто не помним */ }
  }

  function paint(mark) {
    box.querySelectorAll('.diary-mark').forEach(function (b) {
      b.classList.toggle('is-mine', Number(b.getAttribute('data-mark')) === mark);
    });
  }

  paint(readMine()[slug]);

  box.querySelectorAll('.diary-mark').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mark = Number(btn.getAttribute('data-mark'));
      fetch('/diary/' + encodeURIComponent(slug) + '/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark: mark, voter: voterId() }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.ok) return;
          saveMine(mark);
          paint(mark);
          var score = document.getElementById('diary-marks-score');
          document.getElementById('diary-marks-avg').textContent = data.avg;
          document.getElementById('diary-marks-count').textContent = data.count;
          if (score) score.hidden = false;
        })
        .catch(function () { /* не поставилась — не беда, текст важнее */ });
    });
  });
})();
