(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav-inner');
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) close();
    });
  });
})();
