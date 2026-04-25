// playlist.js — Album-grouped playlist with animated expand/collapse

const Playlist = (() => {
  let tracks       = [];
  let albums       = [];   // [{ name, cover, tracks: [{ ...track, globalIndex }] }]
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
    albums = groupByAlbum(tracks);
    render();
    updateCount();
    return tracks;
  }

  // ── Group flat track list into albums ──────────────────────
  function groupByAlbum(trackList) {
    const map = new Map();
    trackList.forEach((track, i) => {
      const key = track.album || 'Singles';
      if (!map.has(key)) {
        map.set(key, {
          name:         key,
          cover:        track.cover || '',
          bandcampUrl:  track.bandcampUrl || '',
          tracks:       [],
        });
      }
      map.get(key).tracks.push({ ...track, globalIndex: i });
    });
    return Array.from(map.values());
  }

  // ── Render album groups ────────────────────────────────────
  function render() {
    const ul = document.getElementById('playlist-items');
    ul.innerHTML = '';

    albums.forEach((album, albumIdx) => {
      const albumLi = document.createElement('li');
      albumLi.className = 'album-group';
      albumLi.dataset.album = albumIdx;

      // Cover art — gradient placeholder if none set
      const coverHTML = album.cover
        ? `<img class="album-cover" src="${album.cover}" alt="${album.name}" />`
        : `<div class="album-cover album-cover-empty"></div>`;

      const buyBtnHTML = album.bandcampUrl
        ? `<a class="album-buy-btn" href="${album.bandcampUrl}" target="_blank" rel="noopener noreferrer" aria-label="Buy ${album.name} on Bandcamp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            BUY ON BANDCAMP
           </a>`
        : '';

      albumLi.innerHTML = `
        <div class="album-row" role="button" aria-expanded="false">
          ${coverHTML}
          <div class="album-info">
            <span class="album-name">${album.name}</span>
            <span class="album-track-count">${album.tracks.length} TRACK${album.tracks.length !== 1 ? 'S' : ''}</span>
          </div>
          ${buyBtnHTML}
          <div class="album-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <ul class="album-tracks" aria-hidden="true"></ul>
      `;

      // Prevent buy button click from toggling the album expand/collapse
      const buyBtn = albumLi.querySelector('.album-buy-btn');
      if (buyBtn) buyBtn.addEventListener('click', e => e.stopPropagation());

      // Populate track rows inside this album
      const trackList = albumLi.querySelector('.album-tracks');
      album.tracks.forEach((track, trackIdx) => {
        const li = document.createElement('li');
        li.className = 'track-item';
        li.dataset.globalIndex = track.globalIndex;
        li.style.transitionDelay = `${trackIdx * 35}ms`;

        li.innerHTML = `
          <div class="track-eq" aria-hidden="true"><span></span><span></span><span></span></div>
          <span class="track-num">${String(trackIdx + 1).padStart(2, '0')}</span>
          <div class="track-meta">
            <span class="track-title">${track.title}</span>
            <span class="track-artist">${track.artist}</span>
          </div>
          <span class="track-dur" data-index="${track.globalIndex}">${track.duration || '--:--'}</span>
        `;

        li.addEventListener('click', () => {
          if (typeof Player !== 'undefined') Player.loadTrack(track.globalIndex, true);
        });

        trackList.appendChild(li);
      });

      // Album row click — toggle expand/collapse
      const albumRow = albumLi.querySelector('.album-row');
      albumRow.addEventListener('click', () => toggleAlbum(albumLi));

      ul.appendChild(albumLi);
    });
  }

  // ── Expand / collapse one album ────────────────────────────
  function toggleAlbum(albumLi) {
    const row       = albumLi.querySelector('.album-row');
    const trackList = albumLi.querySelector('.album-tracks');
    const isOpen    = albumLi.classList.contains('open');

    if (isOpen) {
      collapseAlbum(albumLi, row, trackList);
    } else {
      expandAlbum(albumLi, row, trackList);
    }
  }

  function expandAlbum(albumLi, row, trackList) {
    albumLi.classList.add('open');
    row.setAttribute('aria-expanded', 'true');
    trackList.setAttribute('aria-hidden', 'false');

    // Animate height 0 → scrollHeight
    trackList.style.height = '0px';
    trackList.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      trackList.style.height = trackList.scrollHeight + 'px';
    });

    // After transition, remove fixed height so content can reflow freely
    trackList.addEventListener('transitionend', () => {
      if (albumLi.classList.contains('open')) {
        trackList.style.height = 'auto';
        trackList.style.overflow = '';
      }
    }, { once: true });

    // Stagger track items sliding in
    trackList.querySelectorAll('.track-item').forEach((item, i) => {
      item.style.opacity         = '0';
      item.style.transform       = 'translateX(-10px)';
      item.style.transitionDelay = `${i * 40}ms`;
      requestAnimationFrame(() => {
        item.style.opacity   = '';
        item.style.transform = '';
      });
    });
  }

  function collapseAlbum(albumLi, row, trackList) {
    albumLi.classList.remove('open');
    row.setAttribute('aria-expanded', 'false');
    trackList.setAttribute('aria-hidden', 'true');

    // Fix height before animating to 0
    trackList.style.height   = trackList.scrollHeight + 'px';
    trackList.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      trackList.style.height = '0px';
    });
  }

  // ── Auto-expand album that contains the active track ───────
  function expandAlbumForIndex(globalIndex) {
    const allGroups = document.querySelectorAll('.album-group');
    allGroups.forEach(group => {
      const trackItem = group.querySelector(`.track-item[data-global-index="${globalIndex}"]`);
      if (trackItem) {
        const isOpen = group.classList.contains('open');
        if (!isOpen) {
          const row       = group.querySelector('.album-row');
          const trackList = group.querySelector('.album-tracks');
          expandAlbum(group, row, trackList);
        }
      }
    });
  }

  // ── Highlight active track row ─────────────────────────────
  function setActive(index) {
    currentIndex = index;
    document.querySelectorAll('.track-item').forEach(item => {
      item.classList.toggle('active', Number(item.dataset.globalIndex) === index);
    });
    expandAlbumForIndex(index);
    scrollToActive();
  }

  // ── Scroll active track into view ─────────────────────────
  function scrollToActive() {
    const ul   = document.getElementById('playlist-items');
    const item = ul.querySelector('.track-item.active');
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ── Update duration label once audio metadata loads ────────
  function setDuration(index, formatted) {
    const el = document.querySelector(`.track-dur[data-index="${index}"]`);
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
