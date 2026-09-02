(function () {
  // Сессионная кука нужна для корзины и входа в админку — она работает всегда
  // и согласия не требует. Согласие спрашиваем только про аналитику: Метрика
  // ставит свои куки и по правилам ЕС без разрешения грузиться не должна.
  var KEY = 'levkaCookieChoice';
  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) { /* приватный режим */ }

  function enableAnalytics() {
    if (typeof window.__startMetrika === 'function') window.__startMetrika();
  }

  if (choice === 'all') {
    enableAnalytics();
    return;
  }
  if (choice === 'necessary') return;

  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* не запомнили — спросим снова */ }
  }

  function build() {
    var bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Файлы cookie');
    bar.innerHTML =
      '<div class="cookie-bar__text">' +
        'Сайт использует необходимые файлы cookie, чтобы работали корзина и вход. ' +
        'С вашего согласия мы также включим аналитику посещений — она помогает понять, ' +
        'что на сайте искали и не нашли. ' +
        '<a href="/legal/privacy">Подробнее</a>' +
      '</div>' +
      '<div class="cookie-bar__actions">' +
        '<button type="button" class="btn cookie-bar__btn" data-choice="all">Принять все</button>' +
        '<button type="button" class="btn cookie-bar__btn cookie-bar__btn--ghost" data-choice="necessary">Только необходимые</button>' +
      '</div>';

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (!b) return;
      var value = b.getAttribute('data-choice');
      remember(value);
      if (value === 'all') enableAnalytics();
      bar.classList.add('is-hidden');
      window.setTimeout(function () { bar.remove(); }, 300);
    });

    document.body.appendChild(bar);
    // Класс вешаем следующим кадром, иначе перехода не будет
    window.requestAnimationFrame(function () { bar.classList.add('is-shown'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
