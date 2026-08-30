// ===== INPUT & TOUCH =====
const keys = {};
const touchInput = { dx: 0, dy: 0, fire: false };
const touchStick = { active: false, pointerId: null, originX: 0, originY: 0 };

function isTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches || 'ontouchstart' in window;
}

function updateTouchControlsVisibility() {
  const el = document.getElementById('touchControls');
  if (!el) return;
  el.classList.toggle('hidden', !(isTouchDevice() && state === 'playing'));
  updateGaugeUI();
}

function resetTouchStick() {
  touchStick.active = false;
  touchStick.pointerId = null;
  touchInput.dx = 0;
  touchInput.dy = 0;
  const knob = document.getElementById('touchStickKnob');
  if (knob) knob.style.transform = 'translate(-50%, -50%)';
}

function getTouchStickMaxR() {
  const area = document.getElementById('touchStickArea');
  if (!area) return 42;
  const rect = area.getBoundingClientRect();
  return Math.max(42, Math.min(rect.width, rect.height) * 0.38);
}

function updateTouchStick(clientX, clientY) {
  const maxR = getTouchStickMaxR();
  let dx = clientX - touchStick.originX;
  let dy = clientY - touchStick.originY;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
  const knob = document.getElementById('touchStickKnob');
  if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  touchInput.dx = dx / maxR;
  touchInput.dy = dy / maxR;
}

function initTouchControls() {
  const area = document.getElementById('touchStickArea');
  const fireBtn = document.getElementById('touchFire');
  const specialBtn = document.getElementById('touchSpecial');
  if (!area || !fireBtn || !specialBtn) return;

  area.addEventListener('pointerdown', e => {
    e.preventDefault();
    area.setPointerCapture(e.pointerId);
    touchStick.active = true;
    touchStick.pointerId = e.pointerId;
    const rect = area.getBoundingClientRect();
    touchStick.originX = rect.left + rect.width / 2;
    touchStick.originY = rect.top + rect.height / 2;
    updateTouchStick(e.clientX, e.clientY);
  });
  area.addEventListener('pointermove', e => {
    if (!touchStick.active || e.pointerId !== touchStick.pointerId) return;
    e.preventDefault();
    updateTouchStick(e.clientX, e.clientY);
  });
  area.addEventListener('pointerup', e => {
    if (e.pointerId !== touchStick.pointerId) return;
    resetTouchStick();
  });
  area.addEventListener('pointercancel', e => {
    if (e.pointerId !== touchStick.pointerId) return;
    resetTouchStick();
  });

  const bindHold = (btn, on, off) => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      on();
    });
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', e => {
      if (!btn.hasPointerCapture(e.pointerId)) off();
    });
  };
  bindHold(fireBtn, () => { touchInput.fire = true; }, () => { touchInput.fire = false; });
  specialBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (state === 'playing') activateSpecial();
  });
}

function layoutMobileViewport() {
  if (!isTouchDevice()) return;
  const wrapper = document.getElementById('gameWrapper');
  if (!wrapper) return;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const aspect = 480 / 680;
  let w = vw, h = w / aspect;
  if (h > vh) { h = vh; w = h * aspect; }
  wrapper.style.width = `${w}px`;
  wrapper.style.height = `${h}px`;
}

function onMobileLayoutChange() {
  layoutMobileViewport();
  updateTouchControlsVisibility();
  if (ScreenUI.isOpen('permTree')) {
    centerPtTreeView();
  }
}

function initMobile() {
  document.body.addEventListener('touchmove', (e) => {
    if (state === 'playing' && isTouchDevice()) e.preventDefault();
  }, { passive: false });

  window.addEventListener('resize', onMobileLayoutChange);
  window.addEventListener('orientationchange', () => setTimeout(onMobileLayoutChange, 150));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onMobileLayoutChange);
  }
  if (isTouchDevice()) {
    setSpeed(1);
    layoutMobileViewport();
  }
}

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (state === 'playing' && e.code === 'KeyZ') activateSpecial();
  if (e.code === 'Digit1') setSpeed(1);
  if (e.code === 'Digit2') setSpeed(2);
  if (e.code === 'Digit4') setSpeed(4);
  if (debugUnlocked && e.code === 'F9') {
    e.preventDefault();
    if (document.getElementById('debugOverlay').classList.contains('hidden')) openDebugPanel();
    else closeDebugPanel();
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
document.addEventListener('contextmenu', e => { if (state === 'playing') e.preventDefault(); });
document.getElementById('startBtn').addEventListener('click', () => { Sfx.unlock(); openDifficultySelect('title'); });
initTouchControls();
initMobile();
window.addEventListener('resize', updateTouchControlsVisibility);

