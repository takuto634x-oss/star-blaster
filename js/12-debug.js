// ===== DEBUG MODE =====
function refreshDebugUnlockUI() {
  document.getElementById('debugBtn')?.classList.toggle('hidden', !debugUnlocked);
  document.getElementById('titleCodePanel')?.classList.toggle('hidden', debugUnlocked);
  if (ScreenUI.isOpen('profile')) {
    renderProfileList();
  }
}

function showDebugUnlockToast() {
  const toast = document.getElementById('debugUnlockToast');
  if (!toast) return;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 1800);
}

function getDebugUnlockCode() {
  return String.fromCharCode(116, 104, 101, 108, 105, 109, 105, 116, 101, 114, 57, 57);
}

function trySubmitTitleCode(raw) {
  if (debugUnlocked || state !== 'title') return false;
  const code = getDebugUnlockCode();
  if (raw.trim().toLowerCase() !== code) return false;
  debugUnlocked = true;
  refreshDebugUnlockUI();
  showDebugUnlockToast();
  return true;
}

function initTitleCodePanel() {
  const input = document.getElementById('titleCodeInput');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (trySubmitTitleCode(input.value)) input.value = '';
  });
  input.addEventListener('blur', () => { input.value = ''; });
}

const debugDraft = {
  charId: 'blaster',
  difficultyId: 'normal',
  shop: {},
  perm: {},
  lives: 3,
  startLevel: 1,
  invincible: false,
  fullGauge: false,
  powerups: { shield: false, multishot: false, rapid: false, laser: false },
};

function showDebugBadge(on) {
  document.getElementById('debugBadge').classList.toggle('hidden', !on);
}

function syncDebugDraftFromGame() {
  debugDraft.charId = activeCharId;
  debugDraft.difficultyId = (state === 'playing' || state === 'debug')
    ? (playDifficultyId || difficultyId || 'normal')
    : (difficultyId || 'normal');
  debugDraft.lives = lives || 3;
  debugDraft.startLevel = level || 1;
  debugDraft.invincible = debugInvincible;
  UPGRADES.forEach(u => { debugDraft.shop[u.id] = upgradeLevels[u.id] || 0; });
  syncPermLevelsFromChar(debugDraft.charId);
  debugDraft.perm = {};
  getActivePermTree().forEach(u => { debugDraft.perm[u.id] = permOwned(u.id); });
}

function readDebugDraftFromUI() {
  debugDraft.lives = Math.max(1, Math.min(9, parseInt(document.getElementById('debugLives').value, 10) || 3));
  debugDraft.startLevel = Math.max(1, Math.min(50, parseInt(document.getElementById('debugStartLevel').value, 10) || 1));
  debugDraft.invincible = document.getElementById('debugInvincible').checked;
  debugDraft.fullGauge = document.getElementById('debugFullGauge').checked;
  debugDraft.powerups.shield = document.getElementById('debugPupShield').checked;
  debugDraft.powerups.multishot = document.getElementById('debugPupMulti').checked;
  debugDraft.powerups.rapid = document.getElementById('debugPupRapid').checked;
  debugDraft.powerups.laser = document.getElementById('debugPupLaser').checked;
}

function writeDebugDraftToUI() {
  document.getElementById('debugLives').value = debugDraft.lives;
  document.getElementById('debugStartLevel').value = debugDraft.startLevel;
  document.getElementById('debugInvincible').checked = debugDraft.invincible;
  document.getElementById('debugFullGauge').checked = debugDraft.fullGauge;
  document.getElementById('debugPupShield').checked = debugDraft.powerups.shield;
  document.getElementById('debugPupMulti').checked = debugDraft.powerups.multishot;
  document.getElementById('debugPupRapid').checked = debugDraft.powerups.rapid;
  document.getElementById('debugPupLaser').checked = debugDraft.powerups.laser;
}

function renderDebugDiffBtns() {
  const wrap = document.getElementById('debugDiffBtns');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(DIFFICULTIES).forEach(id => {
    const d = DIFFICULTIES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'debug-char-btn' + (debugDraft.difficultyId === id ? ' active' : '');
    btn.dataset.diff = id;
    btn.textContent = d.label;
    btn.title = d.desc;
    btn.addEventListener('click', () => {
      debugDraft.difficultyId = id;
      renderDebugDiffBtns();
    });
    wrap.appendChild(btn);
  });
}

function renderDebugCharBtns() {
  const wrap = document.getElementById('debugCharBtns');
  wrap.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'debug-char-btn' + (debugDraft.charId === ch.id ? ' active' : '');
    btn.textContent = ch.name;
    btn.addEventListener('click', () => {
      debugDraft.charId = ch.id;
      renderDebugCharBtns();
      renderDebugPermGrid();
    });
    wrap.appendChild(btn);
  });
}

function makeDebugStepper(name, lv, maxLv, onChange) {
  const row = document.createElement('div');
  row.className = 'debug-item';
  const label = document.createElement('span');
  label.className = 'debug-item-name';
  label.textContent = name;
  label.title = name;
  const stepper = document.createElement('div');
  stepper.className = 'debug-stepper';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'debug-step-btn';
  minus.textContent = '−';
  const lvEl = document.createElement('span');
  lvEl.className = 'debug-lv';
  lvEl.textContent = `${lv}/${maxLv}`;
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'debug-step-btn';
  plus.textContent = '+';
  const refresh = () => {
    lvEl.textContent = `${lv}/${maxLv}`;
    minus.disabled = lv <= 0;
    plus.disabled = lv >= maxLv;
  };
  minus.addEventListener('click', () => { if (lv > 0) { lv--; onChange(lv); refresh(); } });
  plus.addEventListener('click', () => { if (lv < maxLv) { lv++; onChange(lv); refresh(); } });
  refresh();
  stepper.append(minus, lvEl, plus);
  row.append(label, stepper);
  return row;
}

function renderDebugShopGrid() {
  const grid = document.getElementById('debugShopGrid');
  grid.innerHTML = '';
  UPGRADES.forEach(u => {
    if (debugDraft.shop[u.id] == null) debugDraft.shop[u.id] = 0;
    let lv = debugDraft.shop[u.id];
    grid.appendChild(makeDebugStepper(u.name, lv, u.maxLevel, v => { debugDraft.shop[u.id] = v; lv = v; }));
  });
}

function renderDebugPermGrid() {
  activeCharId = debugDraft.charId;
  syncPermLevelsFromChar(activeCharId);
  const tree = getActivePermTree();
  const grid = document.getElementById('debugPermGrid');
  grid.innerHTML = '';
  tree.forEach(u => {
    if (debugDraft.perm[u.id] == null) debugDraft.perm[u.id] = permLv(u.id);
    let lv = debugDraft.perm[u.id];
    grid.appendChild(makeDebugStepper(u.name, lv, u.maxLevel, v => { debugDraft.perm[u.id] = v; lv = v; }));
  });
}

function renderDebugPanel() {
  renderDebugCharBtns();
  renderDebugDiffBtns();
  writeDebugDraftToUI();
  renderDebugShopGrid();
  renderDebugPermGrid();
  Feedback.renderDebugList();
}

function openDebugPanel() {
  if (!debugUnlocked || state === 'upgrade') return;
  if (state === 'playing') {
    debugPauseReturn = true;
    state = 'debug';
  } else {
    debugPauseReturn = false;
  }
  syncDebugDraftFromGame();
  renderDebugPanel();
  ScreenUI.close('title');
  ScreenUI.close('permTree');
  ScreenUI.open('debug');
}

function closeDebugPanel() {
  ScreenUI.close('debug');
  if (debugPauseReturn) {
    state = 'playing';
    debugPauseReturn = false;
  }
  if (state === 'title' || state === 'gameover') {
    ScreenUI.open('title');
  }
}

function applyDebugSettings() {
  readDebugDraftFromUI();
  difficultyId = debugDraft.difficultyId;
  playDifficultyId = debugDraft.difficultyId;
  applyPlayerHitRadius();
  debugInvincible = debugDraft.invincible;
  activeCharId = debugDraft.charId;
  syncPermLevelsFromChar(activeCharId);
  getActivePermTree().forEach(u => {
    permLevels[u.id] = Math.min(u.maxLevel, debugDraft.perm[u.id] || 0);
  });
  Object.keys(permActiveLevels).forEach(k => delete permActiveLevels[k]);
  UPGRADES.forEach(u => {
    upgradeLevels[u.id] = Math.min(u.maxLevel, debugDraft.shop[u.id] || 0);
  });
  lives = debugDraft.lives;
  level = debugDraft.startLevel;
  document.getElementById('levelDisplay').textContent = level;
  updateLivesUI();
  if (debugDraft.fullGauge) {
    specialGauge = getGaugeMax();
  } else {
    applyStartGaugeFill();
  }
  updateGaugeUI();
  player.powerups = { multishot: 0, shield: 0, rapid: 0, laser: 0, freeze: 0 };
  if (debugDraft.powerups.shield || permLv('startShield') >= 1) player.powerups.shield = 1;
  if (debugDraft.powerups.multishot) player.powerups.multishot = 600;
  const rapidDur = debugDraft.powerups.rapid ? 600 : getStartPowerupDuration('startRapid');
  if (rapidDur > 0) player.powerups.rapid = rapidDur;
  const laserDur = debugDraft.powerups.laser ? 600 : getStartPowerupDuration('startLaser');
  if (laserDur > 0) player.powerups.laser = laserDur;
  if (permLv('startShield') >= 2) Combat.grantIFrames(120);
  if (permLv('startShield') >= 4) Combat.grantIFrames(180);
  permArmorUsed = 0;
  shieldRechargeTimer = getEffectiveShieldRechargeInterval() || 0;
  updateAbilityCapUI();
}

function applyDebugLive() {
  if (state !== 'playing' && state !== 'debug') return;
  applyDebugSettings();
}

function startDebugGame() {
  readDebugDraftFromUI();
  difficultyId = debugDraft.difficultyId;
  debugMode = true;
  debugPauseReturn = false;
  startGame(true);
  showDebugBadge(true);
}

function initDebugMode() {
  sessionStorage.removeItem('sb_debug'); // 旧バージョンの永続解除を消去
  debugUnlocked = false;
  refreshDebugUnlockUI();
  initTitleCodePanel();
  document.getElementById('debugBtn')?.addEventListener('click', () => {
    if (debugUnlocked) openDebugPanel();
  });
  document.getElementById('debugCloseBtn')?.addEventListener('click', closeDebugPanel);
  document.getElementById('debugStartBtn')?.addEventListener('click', startDebugGame);
  document.getElementById('debugApplyBtn')?.addEventListener('click', applyDebugLive);
}

