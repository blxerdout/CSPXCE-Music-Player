// galaxy.js — Rotating spiral galaxy background

(function () {
  const canvas = document.getElementById('galaxy-bg');
  const ctx    = canvas.getContext('2d');

  // ── Config ──────────────────────────────────────────────────
  const CFG = {
    arms:          4,          // number of spiral arms
    starsPerArm:   220,        // stars per arm
    dustPerArm:    80,         // soft dust clouds per arm
    coreStars:     160,        // dense center cluster
    outerStars:    120,        // scattered background field
    armSpread:     0.38,       // how wide each arm fans out
    armLength:     2.6,        // spiral tightness (radians)
    rotationSpeed: 0.000216,   // radians per frame
    coreRotSpeed:  0.000408,   // core spins slightly faster
    maxRadius:     0.46,       // galaxy radius as fraction of min(w,h)

    // Color palette — purple / blue / white
    colors: [
      { r: 191, g:  95, b: 255 },   // purple-bright
      { r:   0, g: 212, b: 255 },   // blue-bright
      { r: 138, g:  43, b: 226 },   // purple-mid
      { r:   0, g: 144, b: 204 },   // blue-mid
      { r: 220, g: 200, b: 255 },   // lavender-white
      { r: 255, g: 255, b: 255 },   // pure white (hot stars)
    ],
  };

  // ── State ────────────────────────────────────────────────────
  let W, H, cx, cy, maxR;
  let rotation     = 0;
  let coreRotation = 0;
  let stars        = [];   // { x, y, r, color, alpha, layer }
  let dust         = [];   // { x, y, rx, ry, angle, color, alpha }
  let coreStars    = [];
  let outerStars   = [];

  // ── Helpers ──────────────────────────────────────────────────
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
  }

  // Archimedes spiral: radius grows linearly with angle
  function spiralPoint(armIndex, t) {
    const baseAngle = (armIndex / CFG.arms) * Math.PI * 2;
    const angle     = baseAngle + t * CFG.armLength;
    const r         = (t * maxR) + rand(0, maxR * CFG.armSpread * (0.3 + t));
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    };
  }

  // ── Build star field ─────────────────────────────────────────
  function buildGalaxy() {
    stars      = [];
    dust       = [];
    coreStars  = [];
    outerStars = [];

    // Spiral arm stars
    for (let arm = 0; arm < CFG.arms; arm++) {
      for (let i = 0; i < CFG.starsPerArm; i++) {
        const t   = i / CFG.starsPerArm;
        const pt  = spiralPoint(arm, t);
        const col = pick(CFG.colors);
        const sz  = rand(0.4, t < 0.2 ? 2.2 : 1.4);   // bigger near core
        stars.push({
          x:     pt.x,
          y:     pt.y,
          r:     sz,
          color: col,
          alpha: rand(0.4, 0.95),
          layer: 1,
          twinkleOffset: rand(0, Math.PI * 2),
          twinkleSpeed:  rand(0.003, 0.012),
        });
      }

      // Dust / nebula blobs along each arm
      for (let i = 0; i < CFG.dustPerArm; i++) {
        const t  = rand(0.05, 0.95);
        const pt = spiralPoint(arm, t);
        const col = pick([CFG.colors[0], CFG.colors[2], CFG.colors[1]]);
        dust.push({
          x:     pt.x,
          y:     pt.y,
          rx:    rand(maxR * 0.04, maxR * 0.13),
          ry:    rand(maxR * 0.02, maxR * 0.07),
          angle: rand(0, Math.PI),
          color: col,
          alpha: rand(0.02, 0.07),
        });
      }
    }

    // Dense core cluster (rotates slightly faster)
    for (let i = 0; i < CFG.coreStars; i++) {
      const angle = rand(0, Math.PI * 2);
      const r     = rand(0, maxR * 0.18) * Math.sqrt(Math.random()); // concentrate toward center
      coreStars.push({
        x:     Math.cos(angle) * r,
        y:     Math.sin(angle) * r,
        r:     rand(0.3, 1.8),
        color: pick(CFG.colors),
        alpha: rand(0.5, 1.0),
        twinkleOffset: rand(0, Math.PI * 2),
        twinkleSpeed:  rand(0.005, 0.018),
      });
    }

    // Scattered outer field (barely moves — feels distant)
    for (let i = 0; i < CFG.outerStars; i++) {
      outerStars.push({
        x:     rand(-W / 2, W / 2),
        y:     rand(-H / 2, H / 2),
        r:     rand(0.3, 1.0),
        color: pick(CFG.colors),
        alpha: rand(0.1, 0.35),
        twinkleOffset: rand(0, Math.PI * 2),
        twinkleSpeed:  rand(0.002, 0.008),
      });
    }
  }

  // ── Resize handler ───────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx    = W / 2;
    cy    = H / 2;
    maxR  = Math.min(W, H) * CFG.maxRadius;
    buildGalaxy();
  }

  // ── Draw one star ────────────────────────────────────────────
  function drawStar(s, frame) {
    const twinkle = 0.15 * Math.sin(frame * s.twinkleSpeed + s.twinkleOffset);
    const a       = Math.max(0, Math.min(1, s.alpha + twinkle));

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(s.color, a);
    ctx.fill();

    // Soft glow halo for brighter stars
    if (s.r > 1.1) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      grad.addColorStop(0, rgba(s.color, a * 0.35));
      grad.addColorStop(1, rgba(s.color, 0));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // ── Main render loop ─────────────────────────────────────────
  let frame = 0;

  function draw() {
    frame++;
    rotation     += CFG.rotationSpeed;
    coreRotation += CFG.coreRotSpeed;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // ── Outer scatter field (no rotation — fixed depth layer) ──
    ctx.save();
    ctx.translate(cx, cy);
    for (const s of outerStars) drawStar(s, frame);
    ctx.restore();

    // ── Dust nebula clouds (rotate with galaxy) ──────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    for (const d of dust) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d.rx);
      grad.addColorStop(0, rgba(d.color, d.alpha));
      grad.addColorStop(1, rgba(d.color, 0));
      ctx.scale(1, d.ry / d.rx);
      ctx.beginPath();
      ctx.arc(0, 0, d.rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // ── Spiral arm stars ─────────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    for (const s of stars) drawStar(s, frame);
    ctx.restore();

    // ── Core glow (composite layers) ────────────────────────
    ctx.save();
    ctx.translate(cx, cy);

    // Outer haze
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.38);
    haze.addColorStop(0,   rgba({ r: 138, g: 43, b: 226 }, 0.10));
    haze.addColorStop(0.4, rgba({ r:  80, g: 20, b: 160 }, 0.05));
    haze.addColorStop(1,   rgba({ r:   0, g:  0, b:   0 }, 0));
    ctx.beginPath();
    ctx.arc(0, 0, maxR * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = haze;
    ctx.fill();

    // Inner bright core
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.10);
    core.addColorStop(0,   rgba({ r: 255, g: 245, b: 255 }, 0.55));
    core.addColorStop(0.3, rgba({ r: 191, g:  95, b: 255 }, 0.25));
    core.addColorStop(0.7, rgba({ r: 138, g:  43, b: 226 }, 0.10));
    core.addColorStop(1,   rgba({ r:   0, g:   0, b:   0 }, 0));
    ctx.beginPath();
    ctx.arc(0, 0, maxR * 0.10, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    // Core star cluster (slightly faster spin)
    ctx.rotate(coreRotation);
    for (const s of coreStars) drawStar(s, frame);

    ctx.restore();

    requestAnimationFrame(draw);
  }

  // ── Init ─────────────────────────────────────────────────────
  window.addEventListener('resize', resize);
  resize();
  draw();
})();
