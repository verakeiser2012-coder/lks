// Кнопки «поделиться». Ссылки на площадки работают и без этого файла —
// скрипт добавляет только то, чего разметкой не сделать: копирование
// ссылки и системное окно телефона.
(function () {
  var box = document.querySelector('[data-share]');
  if (!box) return;

  var url = box.getAttribute('data-url');
  var title = box.getAttribute('data-title');
  var done = box.querySelector('[data-share-done]');

  function flash() {
    if (!done) return;
    done.hidden = false;
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () { done.hidden = true; }, 2000);
  }

  var copy = box.querySelector('[data-share-copy]');
  if (copy) {
    copy.addEventListener('click', function () {
      // clipboard есть не везде (нужен https или localhost) — на этот случай
      // старый способ через скрытое поле, иначе кнопка молча ничего не делала бы.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(flash, fallback);
      } else {
        fallback();
      }
    });
  }

  function fallback() {
    var f = document.createElement('textarea');
    f.value = url;
    f.setAttribute('readonly', '');
    f.style.position = 'fixed';
    f.style.opacity = '0';
    document.body.appendChild(f);
    f.select();
    try { document.execCommand('copy'); flash(); } catch (e) {}
    document.body.removeChild(f);
  }

  // Системное окно показываем только там, где оно есть: на телефоне это
  // Telegram, WhatsApp и всё остальное, что у человека стоит.
  var native = box.querySelector('[data-share-native]');
  if (native && navigator.share) {
    native.hidden = false;
    native.addEventListener('click', function () {
      navigator.share({ title: title, url: url }).catch(function () {});
    });
  }
})();
