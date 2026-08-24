(function () {
  var STORAGE_KEY = 'levkaBgMusicOff';
  var VOLUME = 0.22;
  var PLAYLIST = [
    '/audio/soundstates.mp3',
    '/audio/2am.mp3',
    '/audio/back-to-the-future.mp3',
    '/audio/cloudflute.mp3',
    '/audio/dream.mp3',
  ];

  var audio = document.getElementById('bg-audio');
  var toggle = document.getElementById('bg-audio-toggle');
  if (!audio || !toggle) return;

  audio.volume = VOLUME;
  var trackIndex = 0;
  audio.src = PLAYLIST[trackIndex];

  audio.addEventListener('ended', function () {
    trackIndex = (trackIndex + 1) % PLAYLIST.length;
    audio.src = PLAYLIST[trackIndex];
    play();
  });

  function setState(playing) {
    toggle.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggle.setAttribute('aria-label', playing ? 'Выключить музыку' : 'Включить музыку');
  }

  function play() {
    var p = audio.play();
    if (p && p.catch) {
      p.then(function () { setState(true); }).catch(function () { setState(false); });
    } else {
      setState(true);
    }
  }

  function pause() {
    audio.pause();
    setState(false);
  }

  var userDisabled = localStorage.getItem(STORAGE_KEY) === '1';
  if (!userDisabled) {
    play();
  } else {
    setState(false);
  }

  toggle.addEventListener('click', function () {
    if (audio.paused) {
      localStorage.removeItem(STORAGE_KEY);
      play();
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      pause();
    }
  });

  var pausedByVisibility = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!audio.paused) {
        pausedByVisibility = true;
        pause();
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      play();
    }
  });
})();
