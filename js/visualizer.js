// visualizer.js — Waveform renderer using Web Audio API AnalyserNode

const Visualizer = (() => {
  const canvas = document.getElementById('visualizer');
  const ctx    = canvas.getContext('2d');

  let analyser  = null;
  let dataArray = null;
  let animId    = null;
  let isRunning = false;

  // ── Colors (mirror CSS variables) ─────────────────────────
  const BLUE_BRIGHT   = '#00d4ff';
  const PURPLE_BRIGHT = '#bf5fff';
  const BLUE_MID      = '#0090cc';

  // ── Resize canvas to match display size + DPR ─────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.offsetWidth;
    const h   = canvas.offsetHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Connect an AnalyserNode and start drawing ──────────────
  function init(analyserNode) {
    analyser          = analyserNode;
    analyser.fftSize  = 2048;
    analyser.smoothingTimeConstant = 0.82;
    dataArray         = new Float32Array(analyser.fftSize);
    resize();
    if (!isRunning) {
      isRunning = true;
      draw();
    }
  }

  // ── Main draw loop ─────────────────────────────────────────
  function draw() {
    animId = requestAnimationFrame(draw);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    ctx.clearRect(0, 0, W, H);

    if (!analyser) {
      drawIdleLine(W, H);
      return;
    }

    analyser.getFloatTimeDomainData(dataArray);

    const len        = dataArray.length;
    const sliceWidth = W / len;
    const midY       = H / 2;

    // ── Filled waveform area (subtle) ──────────────────────
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = i * sliceWidth;
      const y = midY + dataArray[i] * midY * 0.92;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(W, midY);
    ctx.lineTo(0, midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 144, 204, 0.06)';
    ctx.fill();

    // ── Primary waveform line — blue glow ──────────────────
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = i * sliceWidth;
      const y = midY + dataArray[i] * midY * 0.92;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineWidth   = 1.8;
    ctx.strokeStyle = BLUE_BRIGHT;
    ctx.shadowColor = BLUE_BRIGHT;
    ctx.shadowBlur  = 10;
    ctx.stroke();

    // ── Secondary pass — purple glow, slightly thicker ─────
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = i * sliceWidth;
      const y = midY + dataArray[i] * midY * 0.92;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineWidth   = 2.8;
    ctx.strokeStyle = `rgba(191, 95, 255, 0.28)`;
    ctx.shadowColor = PURPLE_BRIGHT;
    ctx.shadowBlur  = 18;
    ctx.stroke();

    // ── Center baseline ────────────────────────────────────
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 0.5;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
  }

  // ── Idle line shown before audio loads ────────────────────
  function drawIdleLine(W, H) {
    const midY = H / 2;
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
  }

  // ── Init idle state immediately ────────────────────────────
  function start() {
    resize();
    if (!isRunning) {
      isRunning = true;
      draw();
    }
  }

  window.addEventListener('resize', resize);

  return { init, start };
})();
