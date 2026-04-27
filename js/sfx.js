// sfx.js — Synthesized galaxy UI sound effects via Web Audio API

const SFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function panelOpen() {
    const ac  = getCtx();
    const now = ac.currentTime;

    const delay           = ac.createDelay(0.2);
    delay.delayTime.value = 0.055;
    const fbGain          = ac.createGain();
    fbGain.gain.value     = 0.28;
    const delayOut        = ac.createGain();
    delayOut.gain.value   = 0.32;
    delay.connect(fbGain);
    fbGain.connect(delay);
    delay.connect(delayOut);
    delayOut.connect(ac.destination);

    const dry       = ac.createGain();
    dry.gain.value  = 0.9;
    dry.connect(ac.destination);

    function send(node) {
      node.connect(dry);
      node.connect(delay);
    }

    // ── 1. Rising shimmer sweep ──────────────────────────────
    const sweep = ac.createOscillator();
    sweep.type  = 'sine';
    sweep.frequency.setValueAtTime(520, now);
    sweep.frequency.exponentialRampToValueAtTime(2200, now + 0.11);

    const sweepGain = ac.createGain();
    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.13, now + 0.015);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    sweep.connect(sweepGain);
    send(sweepGain);
    sweep.start(now);
    sweep.stop(now + 0.125);

    const sweep2 = ac.createOscillator();
    sweep2.type  = 'sine';
    sweep2.frequency.setValueAtTime(1040, now);
    sweep2.frequency.exponentialRampToValueAtTime(4400, now + 0.11);

    const sweep2Gain = ac.createGain();
    sweep2Gain.gain.setValueAtTime(0.001, now);
    sweep2Gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
    sweep2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    sweep2.connect(sweep2Gain);
    send(sweep2Gain);
    sweep2.start(now);
    sweep2.stop(now + 0.115);

    // ── 2. Star sparkles ─────────────────────────────────────
    const sparkles = [
      { freq: 1047, t: 0.04,  peak: 0.11,  decay: 0.225 },
      { freq: 1319, t: 0.065, peak: 0.09,  decay: 0.21  },
      { freq: 1568, t: 0.085, peak: 0.09,  decay: 0.20  },
      { freq: 2093, t: 0.105, peak: 0.07,  decay: 0.18  },
      { freq: 2637, t: 0.125, peak: 0.055, decay: 0.15  },
    ];

    sparkles.forEach(({ freq, t, peak, decay }) => {
      const osc   = ac.createOscillator();
      osc.type    = 'sine';
      const start = now + t;
      osc.frequency.setValueAtTime(freq * 0.995, start);
      osc.frequency.linearRampToValueAtTime(freq, start + 0.013);

      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.009);
      g.gain.exponentialRampToValueAtTime(0.001, start + decay);

      osc.connect(g);
      send(g);
      osc.start(start);
      osc.stop(start + decay + 0.01);
    });

    // ── 3. Trailing shimmer halo ─────────────────────────────
    const halo = ac.createOscillator();
    halo.type  = 'triangle';
    halo.frequency.setValueAtTime(3520, now + 0.09);
    halo.frequency.exponentialRampToValueAtTime(3200, now + 0.275);

    const haloGain = ac.createGain();
    haloGain.gain.setValueAtTime(0.001, now + 0.09);
    haloGain.gain.linearRampToValueAtTime(0.045, now + 0.13);
    haloGain.gain.exponentialRampToValueAtTime(0.001, now + 0.325);

    halo.connect(haloGain);
    send(haloGain);
    halo.start(now + 0.09);
    halo.stop(now + 0.34);
  }

  return { panelOpen };
})();
