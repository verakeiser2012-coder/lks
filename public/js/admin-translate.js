// Кнопки «Перевести на английский» в админке.
//
// Разметка: <button type="button" class="btn translate-btn"
//             data-translate-from="#id-русского-поля[,#ещё-поле]"
//             data-translate-to="#id-английского-поля[,#ещё-поле]">…</button>
// Поля перечисляются парами по порядку. Перевод делает сервер (POST /admin/translate,
// src/services/translate.js); результат подставляется в поле-получатель целиком,
// если там уже что-то было — спрашиваем, заменить ли.
(function () {
  function $(sel) { return document.querySelector(sel); }
  function list(attr) {
    return attr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  document.querySelectorAll('.translate-btn').forEach(function (btn) {
    var fromSel = list(btn.getAttribute('data-translate-from') || '');
    var toSel = list(btn.getAttribute('data-translate-to') || '');
    if (!fromSel.length || fromSel.length !== toSel.length) return;
    var label = btn.textContent;
    var status = document.createElement('span');
    status.className = 'translate-status';
    btn.insertAdjacentElement('afterend', status);

    btn.addEventListener('click', function () {
      var sources = fromSel.map($);
      var targets = toSel.map($);
      if (sources.some(function (el) { return !el; }) || targets.some(function (el) { return !el; })) return;
      var texts = sources.map(function (el) { return el.value; });
      if (!texts.some(function (t) { return t.trim(); })) {
        status.textContent = 'Русский текст пустой — переводить нечего.';
        return;
      }
      var hasOld = targets.some(function (el) { return el.value.trim(); });
      if (hasOld && !confirm('В английском поле уже есть текст. Заменить его переводом?')) return;

      btn.disabled = true;
      btn.textContent = 'Перевожу…';
      status.textContent = '';
      fetch('/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: texts }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok || !res.data || !Array.isArray(res.data.translations)) {
            throw new Error((res.data && res.data.error) || 'сервер не ответил');
          }
          res.data.translations.forEach(function (t, i) {
            targets[i].value = t;
            targets[i].dispatchEvent(new Event('input', { bubbles: true }));
          });
          // Необязательно: после перевода переключить селект (например, язык новости на en).
          var afterSel = btn.getAttribute('data-translate-then-select');
          var afterVal = btn.getAttribute('data-translate-then-value');
          if (afterSel && afterVal !== null) {
            var sel = $(afterSel);
            if (sel) { sel.value = afterVal; sel.dispatchEvent(new Event('change', { bubbles: true })); }
          }
          status.textContent = 'Готово — проверь перевод глазами.';
        })
        .catch(function (e) {
          status.textContent = 'Не удалось перевести: ' + e.message;
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  });
})();
