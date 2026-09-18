// Форма заявки с выбором возраста («Рыжие», конкурс): поля родителя и подписи
// меняются от выбора; без скрипта форма тоже работает — сервер проверяет всё сам.
(function () {
  document.querySelectorAll('form[data-age-form]').forEach(function (form) {
    var box = form.querySelector('[data-guardian]');
    var labels = form.querySelectorAll('[data-age-label]');
    var privacy = '<a href="/legal/privacy" target="_blank" rel="noopener">политикой конфиденциальности</a>';
    function apply() {
      var v = (form.querySelector('input[name="age"]:checked') || {}).value || 'adult';
      if (box) {
        box.hidden = v === 'adult';
        box.querySelectorAll('input').forEach(function (i) { i.required = v !== 'adult'; });
      }
      labels.forEach(function (el) {
        var t = el.getAttribute('data-' + v) || el.getAttribute('data-adult');
        if (!t) return;
        el.innerHTML = t.replace('политикой конфиденциальности', privacy);
      });
    }
    form.querySelectorAll('input[name="age"]').forEach(function (r) { r.addEventListener('change', apply); });
    apply();
  });
})();
