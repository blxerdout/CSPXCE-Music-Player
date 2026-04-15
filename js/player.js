// player.js — Core audio engine, controls, and Web Audio API wiring

const Player = (() => {

  // ── DOM refs ───────────────────────────────────────────────
  const audio        = document.getElementById('audio-engine');
  const btnPlay      = document.getElementById('btn-play');
  const btnPrev      = document.getElementById('btn-prev');
  const btnNext      = document.getElementById('btn-next');
  const btnShuffle   = document.getElementById('btn-shuffle');
  const btnRepeat    = document.getElementById('btn-repeat');
  const progressBar  = document.getElementById('progress-bar');
  const volumeBar    = document.getElementById('volume-bar');
  const currentTime  = document.getElementById('current-time');
  const durationEl   = document.getElementById('duration');
  const trackTitle   = document.getElementById('track-title');
  const trackArtist  = document.getElementById('track-artist');
  const coverImg     = document.getElementById('cover');
  const iconPlay     = document.getElementById('icon-play');
  const iconPause    = document.getElementById('icon-pause');

  // ── State ──────────────────────────────────────────────────
  let audioCtx      = null;
  let sourceNode    = null;
  let gainNode      = null;
  let analyser      = null;
  let isPlaying     = false;
  let shuffle       = false;
  let repeat        = false;
  let currentIndex  = 0;
  let tracks        = [];
  let dragging      = false;
  let shuffleQueue  = [];

  // ── Web Audio API setup (lazy — requires user gesture) ────
  function initAudioContext() {
    if (audioCtx) return;
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    gainNode   = audioCtx.createGain();
    analyser   = audioCtx.createAnalyser();
    // Chain: source → gain → analyser → output
    sourceNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    // Apply current slider value to gain immediately
    gainNode.gain.value = Number(volumeBar.value);
    Visualizer.init(analyser);
  }

  // ── Time formatter ─────────────────────────────────────────
  function fmt(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Progress bar fill (CSS custom property) ───────────────
  function setFill(bar, pct) {
    bar.style.setProperty('--fill', `${pct}%`);
    bar.classList.add('has-fill');
  }

  // ── Load a track by index ──────────────────────────────────
  function loadTrack(index, autoPlay = false) {
    if (!tracks.length) return;
    index        = ((index % tracks.length) + tracks.length) % tracks.length;
    currentIndex = index;
    const track  = tracks[index];

    // Update audio source
    audio.src = track.src;
    audio.load();

    // Update UI — track info
    trackTitle.textContent  = track.title  || 'Unknown Title';
    trackArtist.textContent = track.artist || 'Unknown Artist';

    // Update album art
    if (track.cover) {
      coverImg.src = track.cover;
      coverImg.style.display = 'block';
    } else {
      coverImg.src = '';
      coverImg.style.display = 'none';
    }

    // Reset progress
    progressBar.value = 0;
    setFill(progressBar, 0);
    currentTime.textContent  = '0:00';
    durationEl.textContent   = track.duration || '0:00';

    // Highlight playlist row
    Playlist.setActive(index);

    if (autoPlay) play();
  }

  // ── Play ───────────────────────────────────────────────────
  function play() {
    initAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audio.play().then(() => {
      isPlaying = true;
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    }).catch(err => console.warn('[Player] Play blocked:', err));
  }

  // ── Pause ──────────────────────────────────────────────────
  function pause() {
    audio.pause();
    isPlaying = false;
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
  }

  // ── Toggle play/pause ──────────────────────────────────────
  function togglePlay() {
    if (!audio.src || audio.src === window.location.href) {
      loadTrack(currentIndex, true);
      return;
    }
    isPlaying ? pause() : play();
  }

  // ── Next track ─────────────────────────────────────────────
  function next() {
    if (shuffle) {
      loadTrack(nextShuffleIndex(), true);
    } else {
      loadTrack(currentIndex + 1, true);
    }
  }

  // ── Previous track ─────────────────────────────────────────
  function prev() {
    // If more than 3 seconds in, restart current track
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    loadTrack(currentIndex - 1, isPlaying);
  }

  // ── Shuffle queue ──────────────────────────────────────────
  function buildShuffleQueue() {
    shuffleQueue = [...Array(tracks.length).keys()]
      .filter(i => i !== currentIndex)
      .sort(() => Math.random() - 0.5);
  }

  function nextShuffleIndex() {
    if (!shuffleQueue.length) buildShuffleQueue();
    return shuffleQueue.shift() ?? 0;
  }

  // ── Audio element events ───────────────────────────────────

  // Duration available
  audio.addEventListener('loadedmetadata', () => {
    const dur = fmt(audio.duration);
    durationEl.textContent = dur;
    progressBar.max = audio.duration;
    Playlist.setDuration(currentIndex, dur);
    // Also patch tracks.json runtime value
    tracks[currentIndex].duration = dur;
  });

  // Time update — progress bar + timestamps
  audio.addEventListener('timeupdate', () => {
    if (dragging) return;
    currentTime.textContent = fmt(audio.currentTime);
    if (audio.duration) {
      progressBar.value = audio.currentTime;
      setFill(progressBar, (audio.currentTime / audio.duration) * 100);
    }
  });

  // Track ended
  audio.addEventListener('ended', () => {
    if (repeat) {
      audio.currentTime = 0;
      play();
    } else {
      next();
    }
  });

  // Buffering state
  audio.addEventListener('waiting', () => {
    btnPlay.style.opacity = '0.5';
  });
  audio.addEventListener('canplay', () => {
    btnPlay.style.opacity = '1';
  });

  // ── Progress bar interaction ───────────────────────────────
  progressBar.addEventListener('mousedown',  () => { dragging = true; });
  progressBar.addEventListener('touchstart', () => { dragging = true; }, { passive: true });

  progressBar.addEventListener('input', () => {
    currentTime.textContent = fmt(Number(progressBar.value));
    setFill(progressBar, (progressBar.value / audio.duration) * 100);
  });

  progressBar.addEventListener('change', () => {
    audio.currentTime = Number(progressBar.value);
    dragging = false;
    if (isPlaying) play();
  });

  progressBar.addEventListener('mouseup',  () => { dragging = false; });
  progressBar.addEventListener('touchend', () => { dragging = false; });

  // ── Volume ─────────────────────────────────────────────────
  setFill(volumeBar, Number(volumeBar.value) * 100);

  volumeBar.addEventListener('input', () => {
    const v = Number(volumeBar.value);
    if (gainNode) gainNode.gain.value = v;
    setFill(volumeBar, v * 100);
  });

  // ── Control buttons ────────────────────────────────────────
  btnPlay.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  btnShuffle.addEventListener('click', () => {
    shuffle = !shuffle;
    btnShuffle.classList.toggle('active', shuffle);
    if (shuffle) buildShuffleQueue();
  });

  btnRepeat.addEventListener('click', () => {
    repeat = !repeat;
    btnRepeat.classList.toggle('active', repeat);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT') return;
    switch (e.code) {
      case 'Space':      e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0); break;
      case 'ArrowLeft':  audio.currentTime = Math.max(audio.currentTime - 5, 0); break;
      case 'ArrowUp':    volumeBar.value = Math.min(Number(volumeBar.value) + 0.05, 1).toFixed(2); if (gainNode) gainNode.gain.value = Number(volumeBar.value); setFill(volumeBar, Number(volumeBar.value) * 100); break;
      case 'ArrowDown':  volumeBar.value = Math.max(Number(volumeBar.value) - 0.05, 0).toFixed(2); if (gainNode) gainNode.gain.value = Number(volumeBar.value); setFill(volumeBar, Number(volumeBar.value) * 100); break;
    }
  });

  // ── Boot ───────────────────────────────────────────────────
  async function init() {
    Visualizer.start();
    tracks = await Playlist.load();
    if (tracks.length) loadTrack(0, false);
  }

  // ── Public API ─────────────────────────────────────────────
  return { init, loadTrack, play, pause, next, prev };
})();

// Start everything
Player.init();
