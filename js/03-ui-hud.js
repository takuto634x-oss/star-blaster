// ===== UI & HUD =====
// ----- speed controls -----
let gameSpeed = 1;
function setSpeed(n) {
  gameSpeed = n;
  document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', +b.dataset.speed === n));
  const warn = document.getElementById('speedWarning');
  if (warn) warn.classList.toggle('hidden', n !== 4);
}
document.querySelectorAll('.speed-btn').forEach(b => b.addEventListener('click', () => { Sfx.play('ui', true); setSpeed(+b.dataset.speed); }));

// ----- visual lite mode (手動・簡略描画) -----
let visualLiteMode = localStorage.getItem('starblaster_lite') === '1';
function useVisualLite() { return visualLiteMode; }
function updateLiteBtn() {
  const btn = document.getElementById('liteBtn');
  if (!btn) return;
  btn.classList.toggle('active', visualLiteMode);
  btn.textContent = visualLiteMode ? 'LITE' : 'HD';
  btn.title = visualLiteMode ? '軽量モード ON（タップで通常描画）' : '軽量モード OFF（タップで簡略描画）';
}
function setVisualLite(on) {
  visualLiteMode = !!on;
  localStorage.setItem('starblaster_lite', visualLiteMode ? '1' : '0');
  updateLiteBtn();
}
updateLiteBtn();
document.getElementById('liteBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  Sfx.play('ui', true);
  setVisualLite(!visualLiteMode);
});

// ----- special gauge -----
const GAUGE_MAX = 100;
const SPECIAL_COOLDOWN_MS = 10000;
let specialGauge = 0;
let specialCooldownUntil = 0;

function isGaugeBlocked() {
  return performance.now() < specialCooldownUntil;
}
function getSpecialCooldownSec() {
  if (!isGaugeBlocked()) return 0;
  return Math.ceil((specialCooldownUntil - performance.now()) / 1000);
}

function addGauge(v) {
  if (isGaugeBlocked()) return;
  const prev = specialGauge;
  specialGauge = Math.min(getGaugeMax(), specialGauge + v);
  if (specialGauge !== prev) updateGaugeUI();
}
function updateGaugeUI() {
  const fill = document.getElementById('gaugeBarFill');
  const hint = document.getElementById('gaugeHint');
  const max = getGaugeMax();
  const cdSec = getSpecialCooldownSec();
  const onCooldown = cdSec > 0;
  fill.style.width = onCooldown ? '0%' : (specialGauge / max * 100) + '%';
  const rdy = !onCooldown && specialGauge >= max;
  fill.classList.toggle('ready', rdy);
  fill.classList.toggle('cooldown', onCooldown);
  if (onCooldown) {
    hint.textContent = `クールダウン ${cdSec}秒`;
  } else if (isTouchDevice()) {
    hint.textContent = rdy ? '▶ READY! SPボタン' : 'SPボタンで発動';
  } else {
    hint.textContent = rdy ? '▶ READY!  Z キーで発動' : 'Z キーで発動';
  }
  hint.classList.toggle('ready', rdy);
  hint.classList.toggle('cooldown', onCooldown);
  document.getElementById('touchSpecial')?.classList.toggle('ready-tap', rdy && isTouchDevice());
}

// ----- lives & powerup HUD -----
function updateUI() {
  document.getElementById('levelDisplay').textContent = level;
  const pui = document.getElementById('powerupIndicator');
  pui.innerHTML = '';
  const defs = [
    {key:'multishot',color:'#00ffcc',label:'MULTI'},
    {key:'rapid',    color:'#ffaa00',label:'RAPID'},
    {key:'laser',    color:'#cc44ff',label:'LASER'},
    {key:'freeze',   color:'#88eeff',label:'FREEZE'},
    {key:'shield',   color:'#00ccff',label:'SHIELD'},
  ];
  defs.forEach(({key,color,label}) => {
    const v = player.powerups[key];
    if (v>0) {
      const s = key==='shield' ? '×1' : `${Math.ceil(v/60)}s`;
      pui.innerHTML += `<div class="pup-item"><div class="pup-dot" style="background:${color}"></div><span style="color:${color};font-size:11px">${label} ${s}</span></div>`;
    }
  });
  if (upgradePoints > 0) {
    pui.innerHTML += `<div class="pup-item" style="margin-top:4px"><div class="pup-dot" style="background:#ffcc00"></div><span style="color:#ffcc00;font-size:11px">${upgradePoints} PT</span></div>`;
  }
}

function updateLivesUI() {
  const el = document.getElementById('livesDisplay');
  el.innerHTML = '';
  const max = Math.max(lives,3);
  for (let i=0;i<max;i++) {
    const d=document.createElement('div');
    d.className='life-icon'+(i>=lives?' empty':'');
    el.appendChild(d);
  }
}

