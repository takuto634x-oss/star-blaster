// ===== SOUND (Web Audio API · 合成SE) =====
const Sfx = (() => {
  let ctx = null;
  const master = 0.42;
  let muted = localStorage.getItem('starblaster_sound') === '0';
  let unlocked = false;
  const lastAt = {};
  const GAP = { shoot: 42, explosion: 35 };

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensureCtx();
  }

  function throttled(id) {
    const gap = GAP[id] || 0;
    if (!gap) return true;
    const now = performance.now();
    if (lastAt[id] && now - lastAt[id] < gap) return false;
    lastAt[id] = now;
    return true;
  }

  function tone(freq, dur, type, vol, startAt) {
    const ac = ensureCtx();
    if (!ac) return;
    const t = startAt ?? ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol * master, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function seqTones(notes, gap, dur, type, vol) {
    const ac = ensureCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    notes.forEach((f, i) => tone(f, dur, type, vol, t0 + i * gap));
  }

  function noise(dur, vol, cutoff) {
    const ac = ensureCtx();
    if (!ac) return;
    const t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff || 900;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol * master, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ac.destination);
    src.start(t);
  }

  const presets = {
    shoot()    { tone(920, 0.05, 'square', 0.14); tone(520, 0.04, 'square', 0.07); },
    laser()    { tone(680, 0.07, 'sawtooth', 0.11); tone(1360, 0.04, 'square', 0.06); },
    special()  { seqTones([440, 554, 659, 880, 1100], 0.045, 0.11, 'square', 0.14); },
    explosion(){ noise(0.14, 0.22, 700); tone(90, 0.16, 'square', 0.18); },
    explosionBig(){ noise(0.32, 0.38, 500); tone(55, 0.35, 'square', 0.3); tone(110, 0.25, 'sawtooth', 0.16); },
    hit()      { tone(140, 0.18, 'sawtooth', 0.22); noise(0.08, 0.12, 400); },
    shield()   { seqTones([523, 784], 0.06, 0.12, 'sine', 0.16); },
    armor()    { tone(220, 0.1, 'triangle', 0.22); tone(330, 0.08, 'square', 0.14); },
    pickup()   { seqTones([523, 659, 784], 0.05, 0.07, 'square', 0.13); },
    pickupLife(){ seqTones([523, 659, 784, 988], 0.055, 0.08, 'square', 0.14); },
    waveClear(){ seqTones([523, 659, 784, 1047], 0.07, 0.1, 'square', 0.12); },
    bossClear(){ seqTones([392, 523, 659, 784, 1047, 1319], 0.08, 0.11, 'square', 0.13); },
    upgrade()  { seqTones([784, 988, 1175], 0.055, 0.08, 'square', 0.13); },
    permUpgrade(){ seqTones([659, 784, 988, 1175], 0.05, 0.09, 'square', 0.14); },
    ui()       { tone(640, 0.035, 'square', 0.09); },
    gameOver() { seqTones([392, 349, 311, 262, 220], 0.11, 0.18, 'sawtooth', 0.15); },
    level()    { seqTones([440, 660, 880], 0.06, 0.08, 'square', 0.1); },
    bossEnter(){ tone(220, 0.14, 'sawtooth', 0.2); const ac = ensureCtx(); if (ac) tone(165, 0.22, 'sawtooth', 0.16, ac.currentTime + 0.15); },
    bomb()     { noise(0.22, 0.32, 450); tone(65, 0.28, 'square', 0.28); },
    start()    { seqTones([330, 440, 554, 880], 0.07, 0.1, 'square', 0.12); },
  };

  function play(id, force) {
    if (muted || !presets[id]) return;
    if (!force && !throttled(id)) return;
    unlock();
    presets[id]();
  }

  function toggleMuted() {
    muted = !muted;
    localStorage.setItem('starblaster_sound', muted ? '0' : '1');
    updateBtn();
    if (!muted) play('ui', true);
  }

  function updateBtn() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.classList.toggle('muted', muted);
    btn.title = muted ? 'サウンド ON' : 'サウンド OFF';
  }

  function init() {
    muted = localStorage.getItem('starblaster_sound') === '0';
    updateBtn();
    document.getElementById('soundBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      unlock();
      toggleMuted();
    });
    const once = () => unlock();
    document.addEventListener('pointerdown', once, { once: true, passive: true });
    document.addEventListener('keydown', once, { once: true });
  }

  return { play, unlock, init };
})();

