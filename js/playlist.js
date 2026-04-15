// playlist.js — Track data loader and playlist UI

const Playlist = (() => {
  let tracks       = [];
  let currentIndex = 0;

  // ── Load tracks from JSON ──────────────────────────────────
  async function load() {
    try {
      const res = await fetch('data/tracks.json');
      tracks = await res.json();
    } catch (e) {
      console.error('[Playlist] Failed to load tracks.json', e);
      tracks = [];
    }
    render();
    updateCount();
    return tracks;
  }

  // ── Render list items ──────────────────────────────────────
  function render() {
    const ul = document.getElementById('playlist-items');
    ul.innerHTML = '';

    tracks.forEach((track, i) => {
      const li = document.createElement('li');
      li.dataset.index = i;

      const thumb = track.cover
        ? `<img class="pl-thumb" src="${track.cover}" alt="${track.title}" />`
        : `<div class="pl-thumb pl-thumb-empty"></div>`;

      li.innerHTML = `
        <div class="pl-eq" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="pl-index">${i + 1}</span>
        ${thumb}
        <div class="pl-meta">
          <span class="pl-title">${track.title}</span>
          <span class="pl-artist">${track.artist}</span>
        </div>
        <span class="pl-duration" data-index="${i}">${track.duration || '--:--'}</span>
      `;

      li.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.loadTrack(i, true);
      });

      ul.appendChild(li);
    });
  }

  // ── Highlight active row ───────────────────────────────────
  function setActive(index) {
    currentIndex = index;
    document.querySelectorAll('#playlist-items li').forEach((li, i) => {
      li.classList.toggle('active', i === index);
    });
    scrollToActive();
  }

  // ── Scroll active item into view ───────────────────────────
  function scrollToActive() {
    const ul   = document.getElementById('playlist-items');
    const item = ul.querySelector('li.active');
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ── Update duration label once audio metadata loads ────────
  function setDuration(index, formatted) {
    const el = document.querySelector(`#playlist-items .pl-duration[data-index="${index}"]`);
    if (el) el.textContent = formatted;
  }

  // ── Update track count badge ───────────────────────────────
  function updateCount() {
    const el = document.getElementById('playlist-count');
    if (el) {
      el.textContent = `${tracks.length} TRACK${tracks.length !== 1 ? 'S' : ''}`;
    }
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    load,
    render,
    setActive,
    setDuration,
    get tracks()       { return tracks; },
    get currentIndex() { return currentIndex; },
  };
})();
