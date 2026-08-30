// ===== VISUAL EFFECTS =====
// ----- performance limits (描画 tier) -----
const MAX_PARTICLES = 55;
const MAX_ENEMY_BULLETS = 65;
const MAX_PLAYER_BULLETS = 50;
let _perfTier = 0;

function refreshPerfTier() {
  if (state !== 'playing') { _perfTier = 0; return; }
  const load = enemies.length + enemyBullets.length + bullets.length + particles.length;
  let target = 0;
  // tier は当たり判定スキップ・星間引き・パーティクル数のみ（描画簡略化は行わない）
  if (level >= 18 || load >= 120) target = 2;
  else if (level >= 10 || load >= 75) target = 1;
  if (target > _perfTier) _perfTier = target;
  else if (_perfTier >= 2 && load < 95 && level < 16) _perfTier = 1;
  else if (_perfTier >= 1 && load < 52 && level < 8) _perfTier = 0;
}
function getPerformanceTier() { return _perfTier; }

function getLevelShootMult() {
  return Math.min(1 + level * 0.08, 1.85);
}
function getLevelBulletSpeedBonus() {
  return Math.min(level * 0.15, 2.2);
}
function getBossIntervalMult() {
  return 1 + Math.max(0, level - 8) * 0.055;
}
function bossTick(interval) {
  return Math.floor(Math.max(1, interval) * getBossIntervalMult());
}

// ----- entity spawn helpers -----
function scaleParticleCount(n) {
  if (useVisualLite()) return Math.max(1, Math.floor(n * 0.35));
  const tier = _perfTier;
  if (tier >= 2) return Math.max(1, Math.floor(n * 0.3));
  if (tier >= 1) return Math.max(1, Math.floor(n * 0.55));
  return n;
}

function trimArray(arr, max) {
  if (arr.length > max) arr.splice(0, arr.length - max);
}

function pushEnemyBullet(b) {
  const wm = getEnemyBulletSpeedMult();
  if (wm !== 1) { b.vx = (b.vx || 0) * wm; b.vy = (b.vy || 0) * wm; }
  if (enemyBullets.length >= MAX_ENEMY_BULLETS) {
    if (!b.boss && !b.homing && Math.random() < 0.5) return;
    enemyBullets.shift();
  }
  enemyBullets.push(b);
}

function makeEnemyFromType(tk, x, y, vx, vy, hp, extra = {}) {
  const t = ENEMY_TYPES[tk];
  const diff = getPlayDifficulty();
  return {
    x, y, vx, vy,
    w: t.w, h: t.h, hp, maxHp: hp,
    score: t.score, speed: t.speed * diff.enemySpeedMult, color: t.color,
    shootChance: t.shootChance * diff.enemyShootMult, gaugeGain: t.gaugeGain,
    type: tk, wobble: Math.random() * Math.PI * 2, frozen: 0,
    ...extra,
  };
}

function isNear(ax, ay, bx, by, margin) {
  return Math.abs(ax - bx) < margin && Math.abs(ay - by) < margin;
}

// ----- particles -----
const particles = [];
function spawnParticles(x, y, count, color, speed=3, life=40) {
  const room = MAX_PARTICLES - particles.length;
  if (room <= 0) return;
  count = Math.min(scaleParticleCount(count), room);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, color, life, maxLife: life, size: 1.5 + Math.random()*2 });
  }
}
function spawnExplosion(x, y, big=false, silent=false) {
  const cols = big ? ['#ff6633','#ff9900','#ffcc00','#fff','#ff3300'] : ['#ff9900','#ffcc00','#ff6600','#fff'];
  const cnt = big ? 40 : 18, spd = big ? 5 : 3;
  const tier = getPerformanceTier();
  const cntScale = tier >= 2 ? 0.35 : tier >= 1 ? 0.55 : 1;
  cols.forEach(c => spawnParticles(x, y, Math.max(1, Math.floor((cnt / cols.length) * cntScale)), c, spd, big ? 60 : 35));
  if (!silent) Sfx.play(big ? 'explosionBig' : 'explosion', big);
}

// ----- background (stars / nebula) -----
const stars = Array.from({length:50}, () => ({
  x: Math.random()*W, y: Math.random()*H,
  size: Math.random()*1.8+0.2, speed: Math.random()*0.8+0.2, alpha: Math.random()*0.7+0.3,
}));

let nebulaGrad1, nebulaGrad2;
function initRenderCache() {
  nebulaGrad1 = ctx.createRadialGradient(W*0.3,H*0.4,0,W*0.3,H*0.4,200);
  nebulaGrad1.addColorStop(0,'#4400aa'); nebulaGrad1.addColorStop(1,'transparent');
  nebulaGrad2 = ctx.createRadialGradient(W*0.7,H*0.7,0,W*0.7,H*0.7,160);
  nebulaGrad2.addColorStop(0,'#003388'); nebulaGrad2.addColorStop(1,'transparent');
}
function drawStars() {
  const skip = _perfTier >= 1 || useVisualLite();
  stars.forEach((s, i) => {
    if (skip && i % 2 === 0) return;
    s.y += s.speed * gameSpeed;
    if (s.y > H) { s.y = 0; s.x = Math.random()*W; }
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
  });
  ctx.globalAlpha = 1;
}

