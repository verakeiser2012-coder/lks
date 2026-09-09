// Плееры «Чем вдохновляюсь» подгружаются по клику. Три iframe Spotify сразу —
// это лишние мегабайты и чужие куки у каждого, кто открыл страницу музыки.
(function () {
  document.querySelectorAll('.inspired-player').forEach(function (box) {
    var btn = box.querySelector('.inspired-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.getAttribute('data-artist');
      if (!id) return;
      var frame = document.createElement('iframe');
      frame.className = 'inspired-frame';
      frame.src = 'https://open.spotify.com/embed/artist/' + id;
      frame.width = '100%';
      frame.height = '152';
      frame.frameBorder = '0';
      frame.loading = 'lazy';
      frame.allow = 'encrypted-media';
      box.replaceChildren(frame);
    });
  });
})();
