(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
    if (items.length === 0) return;

    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML =
      '<button class="lightbox-close" type="button" aria-label="Закрыть">&times;</button>' +
      '<button class="lightbox-prev" type="button" aria-label="Предыдущее">&#8249;</button>' +
      '<div class="lightbox-content"></div>' +
      '<button class="lightbox-next" type="button" aria-label="Следующее">&#8250;</button>';
    document.body.appendChild(overlay);

    var content = overlay.querySelector('.lightbox-content');
    var current = 0;

    function render() {
      var media = items[current].querySelector('img, video');
      content.innerHTML = '';
      if (!media) return;
      if (media.tagName === 'IMG') {
        var img = document.createElement('img');
        img.src = media.getAttribute('src');
        img.alt = media.getAttribute('alt') || '';
        content.appendChild(img);
      } else {
        var video = document.createElement('video');
        video.src = media.getAttribute('src');
        video.controls = true;
        video.autoplay = true;
        content.appendChild(video);
      }
    }

    function open(index) {
      current = index;
      render();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('open');
      content.innerHTML = '';
      document.body.style.overflow = '';
    }

    function next() {
      current = (current + 1) % items.length;
      render();
    }

    function prev() {
      current = (current - 1 + items.length) % items.length;
      render();
    }

    items.forEach(function (item, index) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        open(index);
      });

      var preview = item.querySelector('video');
      if (preview) {
        item.addEventListener('mouseenter', function () {
          preview.play().catch(function () {});
        });
        item.addEventListener('mouseleave', function () {
          preview.pause();
          preview.currentTime = 0;
        });
      }
    });

    overlay.querySelector('.lightbox-close').addEventListener('click', close);
    overlay.querySelector('.lightbox-next').addEventListener('click', next);
    overlay.querySelector('.lightbox-prev').addEventListener('click', prev);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });
  });
})();
