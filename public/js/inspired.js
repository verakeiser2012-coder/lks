// Плееры «Чем вдохновляюсь» подгружаются по клику. Сразу три чужих iframe —
// это лишние мегабайты и чужие куки у каждого, кто открыл страницу музыки.
//
// Площадка — Яндекс Музыка, а не Spotify: из России Spotify часто не
// открывается, и кнопка «послушать» давала бы пустой прямоугольник.
// Ссылки на обе площадки остаются рядом текстом.
(function () {
  document.querySelectorAll('.inspired-player').forEach(function (box) {
    var btn = box.querySelector('.inspired-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.getAttribute('data-yandex');
      if (!id) return;
      var frame = document.createElement('iframe');
      frame.className = 'inspired-frame';
      frame.src = 'https://music.yandex.ru/iframe/artist/' + id;
      frame.width = '100%';
      frame.height = '180';
      frame.frameBorder = '0';
      frame.loading = 'lazy';
      frame.setAttribute('title', 'Плеер Яндекс Музыки');
      box.replaceChildren(frame);
    });
  });
})();
