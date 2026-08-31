// ===== INPUT & TOUCH =====
const keys = {};
const touchInput = { dx: 0, dy: 0, fire: false };
const touchStick = { active: false, pointerId: null, originX: 0, originY: 0 };
const touchFirePointers = new Set();
let touchControlsInited = false;

function isTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches || 'ontouchstart' in window;
}

function isTouchControlTarget(node) {
  if (!node || !node.closest) return false;
  return !!node.closest('#touchControls, button, .btn, input, textarea, select, label, a, [id$="Overlay"], #overlay, #contextHint');
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

function resetTouchInput() {
  resetTouchStick();
  touchFirePointers.clear();
  touchInput.fire = false;
  document.querySelectorAll('.touch-btn.pressed').forEach(btn => btn.classList.remove('pressed'));
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

function releasePointer(btn, e) {
  try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
  btn.classList.remove('pressed');
}

function setTouchFire(pointerId, on) {
  if (on) touchFirePointers.add(pointerId);
  else touchFirePointers.delete(pointerId);
  touchInput.fire = touchFirePointers.size > 0;
}

function initTouchControls() {
  if (touchControlsInited) return;
  const area = document.getElementById('touchStickArea');
  const fireBtn = document.getElementById('touchFire');
  const specialBtn = document.getElementById('touchSpecial');
  if (!area || !fireBtn || !specialBtn) return;
  touchControlsInited = true;

  area.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    area.setPointerCapture(e.pointerId);
    touchStick.active = true;
    touchStick.pointerId = e.pointerId;
    const rect = area.getBoundingClientRect();
    touchStick.originX = rect.left + rect.width / 2;
    touchStick.originY = rect.top + rect.height / 2;
    updateTouchStick(e.clientX, e.clientY);
  }, { passive: false });

  area.addEventListener('pointermove', e => {
    if (!touchStick.active || e.pointerId !== touchStick.pointerId) return;
    e.preventDefault();
    updateTouchStick(e.clientX, e.clientY);
  }, { passive: false });

  const endStick = e => {
    if (e.pointerId !== touchStick.pointerId) return;
    try { area.releasePointerCapture(e.pointerId); } catch (_) {}
    resetTouchStick();
  };
  area.addEventListener('pointerup', endStick);
  area.addEventListener('pointercancel', endStick);
  area.addEventListener('lostpointercapture', endStick);

  fireBtn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    fireBtn.setPointerCapture(e.pointerId);
    fireBtn.classList.add('pressed');
    setTouchFire(e.pointerId, true);
  }, { passive: false });

  const endFire = e => {
    if (!touchFirePointers.has(e.pointerId)) return;
    setTouchFire(e.pointerId, false);
    releasePointer(fireBtn, e);
  };
  fireBtn.addEventListener('pointerup', endFire);
  fireBtn.addEventListener('pointercancel', endFire);
  fireBtn.addEventListener('lostpointercapture', endFire);

  let specialTapId = null;
  specialBtn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    specialBtn.setPointerCapture(e.pointerId);
    specialBtn.classList.add('pressed');
    specialTapId = e.pointerId;
  }, { passive: false });

  const endSpecial = e => {
    if (specialTapId !== e.pointerId) return;
    specialTapId = null;
    releasePointer(specialBtn, e);
    if (state === 'playing') activateSpecial();
  };
  specialBtn.addEventListener('pointerup', endSpecial);
  specialBtn.addEventListener('pointercancel', endSpecial);
  specialBtn.addEventListener('lostpointercapture', () => {
    specialTapId = null;
    specialBtn.classList.remove('pressed');
  });
}

const MOBILE_BTN_SEL = 'button, .btn, .speed-btn, .upg-buy, .upg-reroll-btn, .upg-continue, .forbidden-buy, .sound-btn, .lite-btn';

function clearMobilePressed() {
  document.querySelectorAll('.touch-pressed').forEach(btn => btn.classList.remove('touch-pressed'));
}

function initMobileButtons() {
  if (initMobileButtons._done) return;
  initMobileButtons._done = true;
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest?.(MOBILE_BTN_SEL);
    if (btn && !btn.disabled) btn.classList.add('touch-pressed');
  }, { passive: true });
  document.addEventListener('pointerup', clearMobilePressed, { passive: true });
  document.addEventListener('pointercancel', clearMobilePressed, { passive: true });
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
    if (state !== 'playing' || !isTouchDevice()) return;
    if (isTouchControlTarget(e.target)) return;
    e.preventDefault();
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

  const releaseOnBackground = () => {
    if (document.hidden || !document.hasFocus()) resetTouchInput();
    clearMobilePressed();
  };
  document.addEventListener('visibilitychange', releaseOnBackground);
  window.addEventListener('blur', releaseOnBackground);
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
document.addEventListener('contextmenu', e => {
  if (state === 'playing' || isTouchControlTarget(e.target)) e.preventDefault();
});
document.getElementById('startBtn').addEventListener('click', () => { Sfx.unlock(); openDifficultySelect('title'); });
initTouchControls();
initMobileButtons();
initMobile();
window.addEventListener('resize', updateTouchControlsVisibility);
