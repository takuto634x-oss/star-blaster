// ===== PLAYER & COMBAT =====
const PLAYER_HIT_DOT_R = 4;

const player = {
  x: W/2, y: H-90, w: 36, h: 44,
  speed: 4,
  shootCooldown: 0,
  invincible: 0,
  powerups: { multishot:0, shield:0, rapid:0, laser:0, freeze:0 },
};

// 被弾・ダメージの唯一の入口（判定 → シールド → アーマー → ライフ減少）
const Combat = (() => {
  const CFG = {
    playerR: 10,
    bulletR: { normal: 7, boss: 8, bomb: 12 },
    laserHalfW: 14,
    shieldIFrames: 45,
    mortarBlastR: 22,
  };

  const hitPopups = [];

  function scaleFrames(base) { return Math.max(1, Math.ceil(base * gameSpeed)); }

  function grantIFrames(baseFrames) {
    player.invincible = scaleFrames(baseFrames);
  }

  function circlesOverlap(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by, r = ar + br;
    return dx * dx + dy * dy < r * r;
  }

  // 線分（弾の移動経路）と円（プレイヤー）の交差
  function segmentHitsCircle(x0, y0, x1, y1, cx, cy, hitR) {
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      const ddx = cx - x0, ddy = cy - y0;
      return ddx * ddx + ddy * ddy < hitR * hitR;
    }
    let t = ((cx - x0) * dx + (cy - y0) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const nx = x0 + t * dx, ny = y0 + t * dy;
    const ddx = cx - nx, ddy = cy - ny;
    return ddx * ddx + ddy * ddy < hitR * hitR;
  }

  function bulletRadius(b) {
    if (b.bomb) return CFG.bulletR.bomb;
    if (b.boss) return CFG.bulletR.boss;
    return CFG.bulletR.normal;
  }

  function showFeedback(text, color) {
    if (hitPopups.length >= 4) hitPopups.shift();
    hitPopups.push({ x: player.x, y: player.y - 28, text, color, life: 45 });
  }

  function applyDamage() {
    if (debugInvincible) return 'iframe';
    if (player.invincible > 0) return 'iframe';

    if (player.powerups.shield > 0) {
      player.powerups.shield = 0;
      spawnParticles(player.x, player.y, 12, '#00ccff', 4, 22);
      grantIFrames(CFG.shieldIFrames);
      showFeedback('SHIELD', '#66ddff');
      Sfx.play('shield', true);
      return 'shield';
    }

    const armorMax = getArmorMaxPerWave();
    if (armorMax > 0 && permArmorUsed < armorMax) {
      permArmorUsed++;
      grantIFrames(Math.floor(getInvincibleFrames() * 0.6) + getPermBastionFrames());
      spawnParticles(player.x, player.y, 14, '#ffaa00', 5, 35);
      showFeedback(`ARMOR ${permArmorUsed}/${armorMax}`, '#ffcc44');
      Sfx.play('armor', true);
      return 'armor';
    }

    lives--;
    grantIFrames(getInvincibleFrames());
    spawnExplosion(player.x, player.y, false, true);
    updateLivesUI();
    showFeedback('-1 LIFE', '#ff5555');
    Sfx.play('hit', true);
    if (lives <= 0) endGame();
    return 'damage';
  }

  function checkBullet(b, prevX, prevY) {
    const br = bulletRadius(b);
    const hitR = CFG.playerR + br;
    const { x: px, y: py } = player;
    if (circlesOverlap(px, py, CFG.playerR, b.x, b.y, br)) return true;
    return segmentHitsCircle(prevX, prevY, b.x, b.y, px, py, hitR);
  }

  function checkEnemyBody(e) {
    return rectsOverlap(
      player.x, player.y, CFG.playerR * 2, CFG.playerR * 2,
      e.x, e.y, e.w * 0.85, e.h * 0.85
    );
  }

  function checkLaser(bossX, bossY, angle, beamLen) {
    const lx1 = bossX + Math.cos(angle) * beamLen;
    const ly1 = bossY + Math.sin(angle) * beamLen;
    const pdx = player.x - lx1, pdy = player.y - ly1;
    const ldx = Math.cos(angle), ldy = Math.sin(angle);
    const proj = pdx * ldx + pdy * ldy;
    const perpDist = Math.abs(pdx * ldy - pdy * ldx);
    return proj > 0 && perpDist < CFG.laserHalfW + CFG.playerR;
  }

  function checkBlast(bx, by, blastR) {
    return circlesOverlap(player.x, player.y, CFG.playerR, bx, by, blastR);
  }

  function tick() {
    if (player.invincible > 0) player.invincible--;
  }

  function drawPopups() {
    for (let i = hitPopups.length - 1; i >= 0; i--) {
      const p = hitPopups[i];
      p.y -= 0.6;
      p.life--;
      if (p.life <= 0) { hitPopups.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life / 45;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  return { CFG, grantIFrames, applyDamage, checkBullet, checkEnemyBody, checkLaser, checkBlast, tick, drawPopups };
})();

function drawPlayerHitbox(x, y) {
  const r = Combat.CFG.playerR;
  const pulse = 0.75 + 0.25 * Math.sin(frameCount * 0.16);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(255, 255, 80, ${0.14 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 240, 60, ${0.95})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 120, 200, ${0.75 + pulse * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(x, y, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const cross = r * 0.5;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.85})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - cross, y); ctx.lineTo(x + cross, y);
  ctx.moveTo(x, y - cross); ctx.lineTo(x, y + cross);
  ctx.stroke();
  ctx.fillStyle = '#ffffaa';
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_HIT_DOT_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const { x, y, w, h } = player;
  const ch = getActiveCharacter();
  ctx.save();
  if (player.invincible > 0) {
    ctx.globalAlpha = Math.floor(frameCount / 4) % 2 === 0 ? 0.35 : 0.9;
  }
  if (useVisualLite()) {
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2 * 0.5);
    ctx.lineTo(x + w * 0.35, y + h / 2); ctx.lineTo(x - w * 0.35, y + h / 2);
    ctx.lineTo(x - w / 2, y + h / 2 * 0.5); ctx.closePath(); ctx.fill();
    if (player.powerups.shield > 0) {
      ctx.strokeStyle = 'rgba(0,200,255,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.85, h * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const ea = 0.5 + 0.3 * Math.sin(frameCount*0.25);
  ctx.shadowColor = ch.color; ctx.shadowBlur = 16;
  ctx.fillStyle = `rgba(0,150,255,${ea})`;
  ctx.beginPath(); ctx.ellipse(x, y+h*0.45, 6, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  const bg = ctx.createLinearGradient(x-w/2, 0, x+w/2, 0);
  bg.addColorStop(0,'#1a4a8a'); bg.addColorStop(0.5,'#2266cc'); bg.addColorStop(1,'#1a4a8a');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x, y-h/2); ctx.lineTo(x+w/2, y+h/2*0.5);
  ctx.lineTo(x+w*0.4, y+h/2); ctx.lineTo(x-w*0.4, y+h/2);
  ctx.lineTo(x-w/2, y+h/2*0.5); ctx.closePath(); ctx.fill();
  const cg = ctx.createRadialGradient(x, y-h*0.1, 2, x, y-h*0.1, 12);
  cg.addColorStop(0,'rgba(150,220,255,0.9)'); cg.addColorStop(1,'rgba(0,80,200,0.4)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(x, y-h*0.1, 8, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0f3070';
  ctx.beginPath(); ctx.moveTo(x-w*0.3,y); ctx.lineTo(x-w*0.9,y+h*0.4); ctx.lineTo(x-w*0.35,y+h*0.38); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x+w*0.3,y); ctx.lineTo(x+w*0.9,y+h*0.4); ctx.lineTo(x+w*0.35,y+h*0.38); ctx.closePath(); ctx.fill();
  if (player.powerups.shield > 0) {
    const a = 0.3 + 0.15*Math.sin(frameCount*0.1);
    ctx.strokeStyle = `rgba(0,200,255,${a+0.3})`; ctx.lineWidth = 2;
    ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(x, y, w*0.85, h*0.7, 0, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ===== BULLETS =====
const bullets = [];
function shootBullet() {
  const { x, y, powerups } = player;
  const baseRate = getShootRate();
  let rate = powerups.rapid > 0 ? Math.max(4, baseRate - 4) : baseRate;
  if (permKillSpeedTimer > 0) rate = Math.max(3, rate - 2);
  if (player.shootCooldown > 0) return;
  if (bullets.length >= MAX_PLAYER_BULLETS) return;
  player.shootCooldown = rate;

  const isLaser = powerups.laser > 0;
  const bSpd   = 12 * getBulletSpeedMult();
  const dmg     = getPlayerDamage();
  const homingS = getHomingStrength();
  const pierce = getPermPierceCount();

  // 角度リスト: 永続+ショップをベースに、MULTIアイテムは弱い場合のみ底上げ
  const angles = getMultiShotAngles();

  angles.forEach(a => {
    bullets.push({
      x: x + Math.sin(a)*12, y: y-20,
      vx: Math.sin(a)*bSpd, vy: -Math.cos(a)*bSpd,
      w: (isLaser ? 5 : 3) * getBulletSizeMult(),
      h: (isLaser ? 20 : 12) * getBulletSizeMult(),
      color: isLaser ? '#cc44ff' : '#00ccff',
      player: true, laser: isLaser,
      damage: dmg, homing: homingS > 0,
      pierceLeft: pierce,
    });
  });
  // サイドショット
  getSideShotAngles().forEach(a => {
    bullets.push({
      x, y: y-20,
      vx: Math.sin(a)*bSpd*0.85, vy: -Math.cos(a)*bSpd*0.85,
      w: (isLaser ? 5 : 3) * getBulletSizeMult(),
      h: (isLaser ? 20 : 12) * getBulletSizeMult(),
      color: isLaser ? '#cc44ff' : '#66ddff',
      player: true, laser: isLaser,
      damage: dmg, homing: homingS > 0,
      pierceLeft: pierce,
    });
  });
  spawnParticles(x, y-22, (useVisualLite() || _perfTier >= 1) ? 1 : 3, isLaser ? '#cc44ff' : '#00eeff', 2, 10);
  Sfx.play(isLaser ? 'laser' : 'shoot');
}

function activateSpecial() {
  const max = getGaugeMax();
  if (specialGauge < max || isGaugeBlocked()) return;
  const wasFull = specialGauge >= max;
  specialGauge = 0;
  specialCooldownUntil = performance.now() + getPermSpecialCooldownMs();
  updateGaugeUI();
  const count = getSpecialCount();
  const dmg   = Math.floor(getSpecialDamage() * (wasFull ? getPermOverchargeMult() : 1));
  const spd   = getSpecialBulletSpeed();
  const life  = getSpecialBulletLife();
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i;
    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3,
      w: 9, h: 9, color: '#ff66ff', player: true, special: true,
      life, damage: dmg,
    });
  }
  spawnParticles(player.x, player.y, scaleParticleCount(45), '#ff88ff', 7, 45);
  spawnParticles(player.x, player.y, scaleParticleCount(25), '#ffffff', 5, 30);
  spawnParticles(player.x, player.y, scaleParticleCount(18), '#cc44ff', 4, 35);
  Sfx.play('special', true);
}

function drawBullet(b) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
  if (b.special) {
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(b.x, b.y, 11, 0, Math.PI * 2); ctx.fill();
  } else {
    const bx = (b.x - b.w / 2) | 0, by = (b.y - b.h) | 0;
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, b.w, b.h);
    if (!useVisualLite()) {
      ctx.fillStyle = b.laser ? 'rgba(255,210,255,0.55)' : 'rgba(180,235,255,0.5)';
      ctx.fillRect(bx + 1, by, Math.max(1, (b.w / 2) | 0), b.h);
    }
  }
  ctx.restore();
}

// ===== ENEMY TYPES & SPAWNING =====
const enemies = [];
let enemyBullets = [];
let bossActive = false, bossRef = null;

// speed × 1.2 / hp は中〜高耐久敵に+1 / shootChance × 1.2 で全体20%強化
const ENEMY_TYPES = {
  basic:   { w:32, h:28, hp:1, score:100,  speed:1.08, color:'#cc3333', shootChance:0.0024, gaugeGain:8  },
  fast:    { w:24, h:20, hp:1, score:150,  speed:1.92, color:'#cc6600', shootChance:0.0012, gaugeGain:12 },
  tank:    { w:42, h:36, hp:3, score:300,  speed:0.66, color:'#6633cc', shootChance:0.0036, gaugeGain:20 },
  sniper:  { w:28, h:28, hp:3, score:250,  speed:0.24, color:'#ff44aa', shootChance:0,      gaugeGain:16 },
  zigzag:  { w:22, h:20, hp:1, score:180,  speed:2.16, color:'#ff8822', shootChance:0.0012, gaugeGain:11 },
  stealth: { w:30, h:26, hp:3, score:260,  speed:0.84, color:'#aa88ff', shootChance:0.0036, gaugeGain:18 },
  splitter:{ w:34, h:30, hp:3, score:220,  speed:0.78, color:'#33cc33', shootChance:0.0024, gaugeGain:16 },
  bomber:  { w:36, h:32, hp:3, score:230,  speed:0.60, color:'#ddcc00', shootChance:0,      gaugeGain:16 },
  charger: { w:24, h:36, hp:1, score:170,  speed:0.96, color:'#ff4400', shootChance:0.0012, gaugeGain:11 },
  mini:    { w:14, h:12, hp:1, score:50,   speed:1.68, color:'#55ee55', shootChance:0,      gaugeGain:4  },
};

function spawnWave() {
  // 敵の数: 高レベル帯は増えすぎないよう緩やかに頭打ち
  const rows = Math.min(2 + Math.floor(level / 3), 4);
  const cols = Math.min(5 + Math.floor(level / 2), level >= 16 ? 8 : 9);

  // 2ウェーブごとに新しい敵種類が解放される
  // lv1-2: basic  lv3-4: +fast  lv5-6: +zigzag  lv7-8: +tank
  // lv9-10: +sniper  lv11-12: +stealth  lv13-14: +splitter
  // lv15-16: +bomber  lv17+: +charger
  const unlockThresholds = [
    { at:1,  type:'basic'    },
    { at:3,  type:'fast'     },
    { at:5,  type:'zigzag'   },
    { at:7,  type:'tank'     },
    { at:9,  type:'sniper'   },
    { at:11, type:'stealth'  },
    { at:13, type:'splitter' },
    { at:15, type:'bomber'   },
    { at:17, type:'charger'  },
  ];
  const pool = unlockThresholds.filter(e => level >= e.at).map(e => e.type);

  // ウェーブごとにHPをスケール: +1HP per 4 waves (lv4→+1, lv8→+2, …)
  const hpBonus = Math.floor(level / 4);
  for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
    const tk = pool[Math.floor(Math.random()*pool.length)];
    const t  = ENEMY_TYPES[tk];
    const xGap = Math.min(W/(cols+1), 52);
    const sx   = (W-xGap*(cols-1))/2;
    const extra = {};
    if (tk==='sniper')  { extra.sniperTimer = 100+Math.random()*100; extra.aimX=null; extra.aimY=null; }
    if (tk==='zigzag')  { extra.zigzagTimer = 15+Math.random()*20; }
    if (tk==='stealth') { extra.ghostTimer  = 60+Math.random()*60;  extra.ghost=false; }
    if (tk==='bomber')  { extra.bombTimer   = 80+Math.random()*80;  }
    if (tk==='charger') { extra.charging=false; extra.chargeVy=0; }
    const scaledHp = Math.max(1, Math.round((t.hp + hpBonus) * getPlayDifficulty().enemyHpMult));
    const spd = (t.speed + level * 0.04) * getPlayDifficulty().enemySpeedMult;
    enemies.push(makeEnemyFromType(tk, sx+c*xGap, -40-r*60, (Math.random()-0.5)*0.5, spd, scaledHp, extra));
  }
}

function spawnMinis(x, y) {
  const miniHp = Math.max(1, Math.round(getPlayDifficulty().enemyHpMult));
  [-1,1].forEach(dir => {
    enemies.push(makeEnemyFromType('mini', x+dir*14, y, dir*2.0, 1.6 * getPlayDifficulty().enemySpeedMult, miniHp));
  });
}

// ボス種類: level に応じて順番にローテーション
// 1: guardian (正面砲撃+螺旋), 2: swarm (分裂+分裂弾),
// 3: laser (レーザー+ショットガン), 4: titan (超重装甲+モルタル),
// 5: phantom (テレポート+螺旋弾幕)
const BOSS_TYPES = ['guardian','swarm','laser','titan','phantom'];
function getBossType() {
  const idx = Math.floor((level-1) / 3) % BOSS_TYPES.length;
  return BOSS_TYPES[idx];
}

function spawnBoss() {
  bossActive = true;
  const btype = getBossType();
  const baseHp = { guardian:40, swarm:32, laser:28, titan:66, phantom:35 }[btype] + Math.round(level*8*2.2);
  const bossHp = Math.max(1, Math.round(baseHp * getPlayDifficulty().enemyHpMult));
  const sz = btype==='titan' ? {w:110,h:85} : btype==='phantom' ? {w:88,h:88} : {w:90,h:70};
  bossRef = {
    x:W/2, y:-80, vx:1.1, vy:0.6,
    ...sz, hp:bossHp, maxHp:bossHp,
    score:5000, phase:1, shootTimer:0,
    type:'boss', bossType: btype,
    gaugeGain:50, frozen:0,
    // swarm用
    spawnTimer: 0,
    // laser用
    laserAngle:0, laserActive:false, laserTimer:0, laserCharge:0,
    laserAngle2:0, laserActive2:false,
    // titan用
    shieldHp: 6, shieldMax: 6, shieldTimer:0,
    // guardian用
    spiralAngle: 0, spiralTimer: 0,
    // phantom用
    teleportTimer: 0, phantomAlpha: 1, teleporting: false,
    spiralAngle2: 0, homingTimer: 0,
  };
  enemies.push(bossRef);
  document.getElementById('bossHealth').classList.add('visible');
  const nameMap = {guardian:'⚠ GUARDIAN',swarm:'⚠ HIVE QUEEN',laser:'⚠ LASER CORE',titan:'⚠ TITAN FORTRESS',phantom:'⚠ PHANTOM'};
  document.querySelector('.boss-label').textContent = nameMap[btype] || '⚠ BOSS';
  Sfx.play('bossEnter', true);
}

// ===== ENEMY AI & MOVEMENT =====
function drawEnemyHitFlash(e, w, h) {
  if (!e.hitFlash || e.hitFlash <= 0) return;
  e.hitFlash--;
  ctx.save();
  ctx.globalAlpha = (e.hitFlash / 8) * 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect((e.x - w / 2) | 0, (e.y - h / 2) | 0, w, h);
  ctx.restore();
}

function drawEnemySimple(e) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  const { x, y, w, h, type, frozen } = e;
  let alpha = 1;
  if (frozen > 0) alpha *= 0.6;
  if (type === 'stealth' && e.ghost) alpha *= 0.18;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = frozen ? '#4488cc' : e.color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.restore();
  drawEnemyHitFlash(e, w, h);
}

function drawEnemy(e) {
  const { x,y,w,h,hp,maxHp,type,frozen } = e;
  const isF  = frozen > 0;
  const fc   = isF ? '#2244aa' : e.color;

  if (useVisualLite()) {
    if (type === 'boss') {
      ctx.save();
      ctx.fillStyle = fc;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      const barW = w * 0.9, barH = 5;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - barW / 2, y - h / 2 - 10, barW, barH);
      ctx.fillStyle = hp / maxHp > 0.5 ? '#44ff44' : '#ff4444';
      ctx.fillRect(x - barW / 2, y - h / 2 - 10, barW * (hp / maxHp), barH);
      ctx.restore();
      return;
    }
    drawEnemySimple(e);
    return;
  }

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  if (frozen > 0) ctx.globalAlpha = 0.55 + 0.15 * Math.sin(frameCount * 0.2);
  if (type === 'stealth' && e.ghost) ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.18;

  // ---- BOSS ----
  if (type === 'boss') {
    const bt = e.bossType || 'guardian';
    const pulse = 0.6+0.4*Math.sin(frameCount*0.1);

    if (bt === 'guardian') {
      // 赤いひし形戦艦
      const bg = ctx.createLinearGradient(x-w/2,y-h/2,x+w/2,y+h/2);
      bg.addColorStop(0, isF?'#112255':'#550000');
      bg.addColorStop(0.5, isF?'#1a3a88':'#aa1111');
      bg.addColorStop(1, isF?'#0a1a44':'#440000');
      ctx.fillStyle = bg; ctx.shadowColor = isF?'#44aaff':'#ff0000'; ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(x,y-h/2); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w*0.4,y+h/2);
      ctx.lineTo(x-w*0.4,y+h/2); ctx.lineTo(x-w/2,y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = isF?`rgba(100,180,255,${pulse})`:`rgba(255,50,50,${pulse})`;
      ctx.shadowColor = isF?'#44aaff':'#ff2200'; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2); ctx.fill();

    } else if (bt === 'swarm') {
      // 緑の六角形ハイブ
      ctx.shadowColor = isF?'#44aaff':'#00ff88'; ctx.shadowBlur = 22;
      ctx.fillStyle = isF?'#1a3a66':'#004433';
      ctx.beginPath();
      for (let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6; ctx.lineTo(x+Math.cos(a)*w/2,y+Math.sin(a)*h/2);}
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = isF?`rgba(100,200,255,${pulse})`:`rgba(0,255,140,${pulse})`;
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.fill();
      // 触手
      ctx.strokeStyle = isF?'#44aaff':'#00ff88'; ctx.lineWidth=2; ctx.shadowBlur=8;
      for (let i=0;i<6;i++){
        const a=i*Math.PI/3+frameCount*0.02;
        ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*18,y+Math.sin(a)*14);
        ctx.lineTo(x+Math.cos(a)*w*0.6,y+Math.sin(a)*h*0.6); ctx.stroke();
      }

    } else if (bt === 'laser') {
      // 青い砲台型
      ctx.shadowColor = isF?'#44aaff':'#0088ff'; ctx.shadowBlur = 24;
      ctx.fillStyle = isF?'#112244':'#001144';
      ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,10); ctx.fill();
      // 砲身
      const laserDir = e.laserAngle || 0;
      ctx.strokeStyle = isF?'#44aaff':'#4488ff'; ctx.lineWidth=7; ctx.shadowBlur=14;
      ctx.beginPath();
      ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(laserDir)*h*0.7,y+Math.sin(laserDir)*h*0.7); ctx.stroke();
      // コア
      ctx.fillStyle = isF?`rgba(80,180,255,${pulse})`:`rgba(0,120,255,${pulse})`;
      ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2); ctx.fill();
      // レーザー発射中
      if (e.laserActive) {
        const drawLaserBeam = (angle) => {
          const lx=x+Math.cos(angle)*(h*0.7);
          const ly=y+Math.sin(angle)*(h*0.7);
          const lx2=x+Math.cos(angle)*1200;
          const ly2=y+Math.sin(angle)*1200;
          ctx.strokeStyle=`rgba(0,180,255,${0.4+0.6*Math.sin(frameCount*0.5)})`;
          ctx.lineWidth=12; ctx.shadowColor='#00aaff'; ctx.shadowBlur=30;
          ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx2,ly2); ctx.stroke();
          ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx2,ly2); ctx.stroke();
        };
        drawLaserBeam(laserDir);
        if (e.laserActive2) drawLaserBeam(e.laserAngle2||laserDir+Math.PI);
      }

    } else if (bt === 'titan') {
      // オレンジの巨大要塞
      ctx.shadowColor = isF?'#44aaff':'#ff6600'; ctx.shadowBlur = 28;
      const bg2 = ctx.createLinearGradient(x-w/2,y-h/2,x+w/2,y+h/2);
      bg2.addColorStop(0, isF?'#223366':'#441100');
      bg2.addColorStop(1, isF?'#112255':'#882200');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,8); ctx.fill();
      // シールド表示
      if (e.shieldHp > 0) {
        const shp = e.shieldHp/e.shieldMax;
        ctx.strokeStyle=`rgba(255,200,0,${0.4+0.4*pulse})`; ctx.lineWidth=4; ctx.shadowColor='#ffcc00'; ctx.shadowBlur=16;
        ctx.beginPath(); ctx.arc(x,y,w*0.62,0,Math.PI*2*shp); ctx.stroke();
      }
      // コア
      ctx.fillStyle = isF?`rgba(100,180,255,${pulse})`:`rgba(255,120,0,${pulse})`;
      ctx.shadowColor = isF?'#44aaff':'#ff8800'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
      // 砲塔×2
      [-1,1].forEach(d=>{
        ctx.fillStyle = isF?'#223366':'#552200';
        ctx.shadowBlur=8;
        ctx.beginPath(); ctx.roundRect(x+d*(w*0.28)-7,y-h/2-8,14,16,3); ctx.fill();
      });

    } else if (bt === 'phantom') {
      // 紫の幽霊型 – テレポート時に半透明
      const pa = e.teleporting ? 0.3 + 0.3*Math.sin(frameCount*0.4) : (e.phantomAlpha ?? 1);
      ctx.globalAlpha = (ctx.globalAlpha||1) * pa;
      ctx.shadowColor = isF?'#44aaff':'#cc44ff'; ctx.shadowBlur = 28;
      // 星形（8頂点）
      ctx.fillStyle = isF?'#112244':'#220033';
      ctx.beginPath();
      for (let i=0;i<16;i++){
        const a=i*Math.PI/8 + frameCount*0.008;
        const r = i%2===0 ? w/2 : w*0.28;
        i===0 ? ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)
               : ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill();
      // 外リング
      ctx.strokeStyle=`rgba(${isF?'100,180,255':'200,80,255'},${0.5+0.5*pulse})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,w*0.55,0,Math.PI*2); ctx.stroke();
      // コア
      ctx.fillStyle=`rgba(${isF?'80,160,255':'220,100,255'},${pulse})`;
      ctx.shadowBlur=20; ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2); ctx.fill();
      // 螺旋軌跡風オーブ
      for(let i=0;i<4;i++){
        const a=e.spiralAngle2+i*Math.PI/2;
        const ox=Math.cos(a)*w*0.38, oy=Math.sin(a)*h*0.38;
        ctx.fillStyle=`rgba(255,160,255,${0.6*pulse})`;
        ctx.shadowBlur=10;
        ctx.beginPath(); ctx.arc(x+ox,y+oy,5,0,Math.PI*2); ctx.fill();
      }
    }

    ctx.shadowBlur=0; ctx.globalAlpha=1;
    const bw=w*1.2;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(x-bw/2,y-h/2-14,bw,6);
    ctx.fillStyle=`hsl(${hp/maxHp*120},80%,50%)`; ctx.fillRect(x-bw/2,y-h/2-14,bw*hp/maxHp,6);
    // ボス名表示
    const bossNames = {guardian:'GUARDIAN',swarm:'HIVE QUEEN',laser:'LASER CORE',titan:'TITAN FORTRESS',phantom:'PHANTOM'};
    ctx.fillStyle=`rgba(255,255,255,0.7)`; ctx.font='bold 11px monospace';
    ctx.textAlign='center'; ctx.fillText(bossNames[bt]||'BOSS', x, y-h/2-18);
    ctx.restore(); return;
  }

  // ---- 通常敵 共通設定 ----
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  const grad = ctx.createLinearGradient(x,y-h/2,x,y+h/2);
  grad.addColorStop(0, fc); grad.addColorStop(1, shadeColor(fc,-40));
  ctx.fillStyle = grad;

  if (type==='basic') {
    ctx.beginPath();
    ctx.moveTo(x,y+h/2); ctx.lineTo(x+w/2,y);
    ctx.lineTo(x+w*0.3,y-h/2); ctx.lineTo(x-w*0.3,y-h/2); ctx.lineTo(x-w/2,y);
    ctx.closePath(); ctx.fill();

  } else if (type==='fast') {
    ctx.beginPath();
    ctx.moveTo(x,y+h/2); ctx.lineTo(x+w/2,y-h/2);
    ctx.lineTo(x,y-h*0.1); ctx.lineTo(x-w/2,y-h/2);
    ctx.closePath(); ctx.fill();

  } else if (type==='tank') {
    ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,6); ctx.fill();
    if (hp<maxHp) {
      ctx.shadowBlur=0; ctx.globalAlpha=1;
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(x-w/2,y-h/2-8,w,4);
      ctx.fillStyle='#66ff66'; ctx.fillRect(x-w/2,y-h/2-8,w*hp/maxHp,4);
    }

  } else if (type==='sniper') {
    // ダイヤモンド形
    ctx.beginPath();
    ctx.moveTo(x,y-h/2); ctx.lineTo(x+w/2,y); ctx.lineTo(x,y+h/2); ctx.lineTo(x-w/2,y);
    ctx.closePath(); ctx.fill();
    // 照準器
    ctx.strokeStyle = fc; ctx.lineWidth = 1.2; ctx.shadowBlur = 0;
    const cs = 6;
    ctx.beginPath(); ctx.moveTo(x-cs,y); ctx.lineTo(x+cs,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-cs); ctx.lineTo(x,y+cs); ctx.stroke();
    // 照準ロック表示
    if (e.aimX != null) {
      const warn = 0.5 + 0.5*Math.sin(frameCount*0.3);
      ctx.save();
      ctx.strokeStyle = `rgba(255,50,80,${warn})`; ctx.lineWidth = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(e.aimX, e.aimY, 12, 0, Math.PI*2); ctx.stroke();
      const rs=6;
      ctx.beginPath(); ctx.moveTo(e.aimX-rs,e.aimY); ctx.lineTo(e.aimX+rs,e.aimY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.aimX,e.aimY-rs); ctx.lineTo(e.aimX,e.aimY+rs); ctx.stroke();
      ctx.restore();
    }

  } else if (type==='zigzag') {
    // W字形（ダブルシェブロン）
    ctx.beginPath();
    ctx.moveTo(x-w/2, y-h/2);
    ctx.lineTo(x-w*0.25, y+h/2);
    ctx.lineTo(x,        y);
    ctx.lineTo(x+w*0.25, y+h/2);
    ctx.lineTo(x+w/2,    y-h/2);
    ctx.lineTo(x+w*0.15, y-h/2);
    ctx.lineTo(x,        y-h*0.1);
    ctx.lineTo(x-w*0.15, y-h/2);
    ctx.closePath(); ctx.fill();

  } else if (type==='stealth') {
    // 六角形
    ctx.beginPath();
    for (let k=0;k<6;k++) {
      const a = (Math.PI/3)*k - Math.PI/6;
      const rx = x + Math.cos(a)*w/2, ry = y + Math.sin(a)*h/2;
      k===0 ? ctx.moveTo(rx,ry) : ctx.lineTo(rx,ry);
    }
    ctx.closePath(); ctx.fill();
    // 透明化フラッシュ演出
    if (!e.ghost && e.ghostTimer < 30) {
      const flicker = Math.abs(Math.sin(frameCount*0.5));
      ctx.fillStyle = `rgba(200,170,255,${flicker*0.4})`;
      ctx.beginPath();
      for (let k=0;k<6;k++) {
        const a=(Math.PI/3)*k-Math.PI/6;
        k===0?ctx.moveTo(x+Math.cos(a)*w/2,y+Math.sin(a)*h/2):ctx.lineTo(x+Math.cos(a)*w/2,y+Math.sin(a)*h/2);
      }
      ctx.closePath(); ctx.fill();
    }

  } else if (type==='splitter') {
    // 丸いボブ形状 + 分割ライン
    ctx.beginPath(); ctx.arc(x,y,w/2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = shadeColor(fc, 40); ctx.lineWidth = 2; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(x,y-h/2+4); ctx.lineTo(x,y+h/2-4); ctx.stroke();

  } else if (type==='bomber') {
    // 太い丸角四角
    ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,8); ctx.fill();
    // 爆弾マーク
    ctx.shadowBlur=0;
    const bpulse = 0.4 + 0.3*Math.sin(frameCount*0.15);
    ctx.fillStyle = `rgba(255,80,0,${bpulse})`;
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(255,80,0,${bpulse})`; ctx.lineWidth = 1.5;
    for (let k=0;k<4;k++) {
      const a = (Math.PI/2)*k;
      ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*6,y+Math.sin(a)*6);
      ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10); ctx.stroke();
    }

  } else if (type==='charger') {
    // 縦長スパイク形
    const chargePulse = e.charging ? (0.6+0.4*Math.sin(frameCount*0.4)) : 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(x, y+h/2);        // 先端（下向き）
    ctx.lineTo(x+w/2, y-h*0.1);
    ctx.lineTo(x+w*0.25, y-h/2);
    ctx.lineTo(x-w*0.25, y-h/2);
    ctx.lineTo(x-w/2, y-h*0.1);
    ctx.closePath();
    ctx.globalAlpha = (ctx.globalAlpha||1) * chargePulse;
    ctx.fill();

  } else if (type==='mini') {
    ctx.beginPath(); ctx.arc(x,y,w/2,0,Math.PI*2); ctx.fill();
  }

  // 共通: 目
  if (type!=='mini' && type!=='bomber' && type!=='charger') {
    ctx.fillStyle = isF?'rgba(150,220,255,0.8)':'rgba(255,200,200,0.8)';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(x,y-h*0.1,3,0,Math.PI*2); ctx.fill();
  }

  ctx.restore();
  drawEnemyHitFlash(e, w, h);
}

function shadeColor(hex, amt) {
  try {
    const n = parseInt(hex.replace(/[^0-9a-f]/gi,'').slice(-6),16);
    return `rgb(${Math.min(255,Math.max(0,(n>>16)+amt))},${Math.min(255,Math.max(0,((n>>8)&0xff)+amt))},${Math.min(255,Math.max(0,(n&0xff)+amt))})`;
  } catch(e) { return hex; }
}
function drawEnemyBullet(b) {
  ctx.save();
  if (useVisualLite()) {
    ctx.fillStyle = b.bomb ? '#ffcc00' : b.sniper ? '#ff44aa' : b.homing ? '#ff8800' : b.mortar ? '#ff4400' : b.boss ? '#ff4444' : '#ff6600';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.bomb ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  if (b.bomb) {
    // 爆弾: 大きな黄色丸
    const p = 0.7 + 0.3*Math.sin(frameCount*0.25);
    ctx.fillStyle = `rgba(255,220,0,${p})`; ctx.shadowColor='#ff8800'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(b.x,b.y,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,100,0,0.8)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(b.x,b.y,10,0,Math.PI*2); ctx.stroke();
  } else if (b.sniper) {
    // スナイパー弾: 細長いピンク
    ctx.fillStyle='#ff44aa'; ctx.shadowColor='#ff44aa'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
    // トレイル
    const len=20, dx=b.vx/7, dy=b.vy/7;
    const tg=ctx.createLinearGradient(b.x,b.y,b.x-dx*len,b.y-dy*len);
    tg.addColorStop(0,'rgba(255,68,170,0.6)'); tg.addColorStop(1,'rgba(255,68,170,0)');
    ctx.strokeStyle=tg; ctx.lineWidth=2; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-dx*len,b.y-dy*len); ctx.stroke();
  } else if (b.homing) {
    // ホーミング弾: オレンジのダイヤ形
    ctx.fillStyle='#ff8800'; ctx.shadowColor='#ffaa00'; ctx.shadowBlur=14;
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
    ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(0,4); ctx.lineTo(-7,0); ctx.lineTo(0,-4); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (b.mortar) {
    // モルタル弾: 大きな赤丸、点滅
    const mp = 0.6+0.4*Math.sin(frameCount*0.35);
    ctx.fillStyle=`rgba(255,60,0,${mp})`; ctx.shadowColor='#ff3300'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(b.x,b.y,8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=`rgba(255,200,0,${mp})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(b.x,b.y,12,0,Math.PI*2); ctx.stroke();
  } else if (b.split) {
    // 分裂弾: 緑の六角形
    ctx.fillStyle='#44ff88'; ctx.shadowColor='#44ff88'; ctx.shadowBlur=12;
    ctx.beginPath();
    for(let k=0;k<6;k++){const a=k*Math.PI/3; ctx.lineTo(b.x+Math.cos(a)*6,b.y+Math.sin(a)*6);}
    ctx.closePath(); ctx.fill();
  } else if (b.phantom) {
    // Phantom弾: 紫の半透明丸
    ctx.fillStyle='rgba(200,80,255,0.85)'; ctx.shadowColor='#cc44ff'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = b.boss?'#ff4444':'#ff6600'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(b.x,b.y,b.boss?5:3,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ===== POWERUPS =====
const powerups = [];
const PUP_TYPES = [
  { key:'multishot', color:'#00ffcc', label:'MULTI', duration:600,  weight:22 },
  { key:'rapid',     color:'#ffaa00', label:'RAPID', duration:600,  weight:20 },
  { key:'shield',    color:'#00ccff', label:'SHLD',  duration:0,    weight:18 },
  { key:'laser',     color:'#cc44ff', label:'LASR',  duration:480,  weight:16 },
  { key:'freeze',    color:'#88eeff', label:'FRZ',   duration:300,  weight:12 },
  { key:'bomb',      color:'#ff6633', label:'BOMB',  duration:0,    weight:8  },
  { key:'life',      color:'#ff44aa', label:'LIFE',  duration:0,    weight:2  },
];
const PUP_TOTAL = PUP_TYPES.reduce((s,t)=>s+t.weight,0);
function pickPup() {
  let r = Math.random()*PUP_TOTAL;
  for (const t of PUP_TYPES) { r -= t.weight; if (r<=0) return t; }
  return PUP_TYPES[0];
}
function spawnPowerup(x,y) {
  const dropRate = 0.02 + getPermItemDropBonus() + getPermLuckyDropBonus() + getShopDropBonus();
  if (Math.random() > dropRate) return;
  powerups.push({ x, y, vy:1.5, type:pickPup(), size:12, wobble:0 });
}
function activatePowerup(type) {
  const pup = player.powerups;
  switch(type.key) {
    case 'multishot': pup.multishot = type.duration; break;
    case 'rapid':     pup.rapid     = type.duration; break;
    case 'laser':     pup.laser     = type.duration; break;
    case 'shield':    pup.shield    = 1;             break;
    case 'freeze':
      enemies.forEach(e => { e.frozen = type.duration; });
      spawnParticles(player.x, player.y, 15, '#88eeff', 4, 30); break;
    case 'bomb':
      enemies.forEach(e => { e.hp--; spawnParticles(e.x,e.y,8,'#ff6633',4,25); });
      enemyBullets.length = 0;
      spawnParticles(W/2, H/2, 30, '#ff9900', 8, 50);
      Sfx.play('bomb', true); break;
    case 'life':
      if (lives < getMaxLives()) { lives++; updateLivesUI(); }
      spawnParticles(player.x, player.y, 12, '#ff44aa', 4, 30);
      Sfx.play('pickupLife', true); return;
  }
  Sfx.play('pickup', true);
}
function drawPowerup(p) {
  const { x,y,type,size } = p;
  ctx.save();
  if (useVisualLite()) {
    ctx.fillStyle = type.color;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.restore();
    return;
  }
  ctx.shadowColor = type.color; ctx.shadowBlur = 14;
  ctx.fillStyle = type.color; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#000';
  ctx.font = 'bold 6px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(type.label, x, y);
  ctx.restore();
}

// ===== COLLISION HELPERS =====
function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax-aw/2<bx+bw/2 && ax+aw/2>bx-bw/2 && ay-ah/2<by+bh/2 && ay+ah/2>by-bh/2;
}

function registerComboKill() {
  if (upgradeLevels.comboKill <= 0) return;
  comboTimer = 150;
  comboCount = Math.min(comboCount + 1, getComboCap());
}

function getComboMult() {
  if (upgradeLevels.comboKill <= 0 || comboCount <= 1) return 1;
  return 1 + (comboCount - 1) * getComboBonusRate();
}

function applyChainKill(fromX, fromY, baseDmg, skipEnemy) {
  const n = getChainTargets();
  if (n <= 0) return;
  const chainDmg = Math.max(1, Math.floor(baseDmg * 0.55));
  const targets = enemies
    .filter(e => e !== skipEnemy && !(e.type === 'stealth' && e.ghost))
    .map(e => ({ e, d: Math.hypot(e.x - fromX, e.y - fromY) }))
    .filter(t => t.d < 120)
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
  targets.forEach(({ e, d }) => {
    e.hp -= chainDmg;
    spawnParticles(e.x, e.y, 6, '#88eeff', 4, 22);
    const midX = fromX + (e.x - fromX) * 0.5, midY = fromY + (e.y - fromY) * 0.5;
    spawnParticles(midX, midY, 4, '#aaccff', 3, 15);
  });
}

function updateOrbitGuard() {
  if ((useVisualLite() || _perfTier >= 2) && frameCount % 2 !== 0) return;
  const count = getOrbitCount();
  if (count <= 0) return;
  const rate = getOrbitGuardShootRate();
  const offsets = getOrbitGuardOffsets(count);
  for (let k = 0; k < count; k++) {
    if (orbitGuardCooldowns[k] > 0) {
      orbitGuardCooldowns[k]--;
      continue;
    }
    const gx = player.x + offsets[k].dx;
    const gy = player.y + offsets[k].dy;
    const target = findNearestEnemy(gx, gy);
    shootOrbitGuardBullet(gx, gy, target);
    orbitGuardCooldowns[k] = rate;
  }
}

function drawOrbitGuard() {
  const count = getOrbitCount();
  if (count <= 0) return;
  const offsets = getOrbitGuardOffsets(count);
  ctx.save();
  for (let k = 0; k < count; k++) {
    const ox = player.x + offsets[k].dx;
    const oy = player.y + offsets[k].dy;
    if (useVisualLite()) {
      ctx.fillStyle = '#44ffaa';
      ctx.fillRect(ox - 4, oy - 6, 8, 10);
      continue;
    }
    const target = findNearestEnemy(ox, oy);
    const pulse = 0.75 + 0.25 * Math.sin(frameCount * 0.2 + k);
    ctx.save();
    ctx.translate(ox, oy);
    if (target) {
      const dx = target.x - ox, dy = target.y - oy;
      ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
    }
    ctx.shadowColor = '#44ffaa';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(60,220,150,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(180,255,220,0.9)';
    ctx.beginPath();
    ctx.arc(0, -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawComboHUD() {
  if (_perfTier >= 2 || comboCount <= 1 || comboTimer <= 0) return;
  ctx.save();
  ctx.font = 'bold 12px Courier New';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc44';
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 8;
  ctx.fillText(`COMBO x${comboCount}`, W / 2, 98);
  ctx.restore();
}

// ----- HUD popups (level / score) -----
let levelTextTimer = 0;
function showLevelText() { levelTextTimer = 90; if (level > 1) Sfx.play('level', true); }
function drawLevelText() {
  if (levelTextTimer<=0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1,levelTextTimer/30);
  ctx.fillStyle='#00ccff'; ctx.font='bold 36px Courier New'; ctx.textAlign='center';
  ctx.shadowColor='#00ccff'; ctx.shadowBlur=20;
  ctx.fillText(`LEVEL ${level}`, W/2, H/2);
  ctx.restore(); levelTextTimer--;
}

// ----- score popups -----
const scorePopups = [];
function addScorePopup(x,y,val) { scorePopups.push({x,y,val,life:50}); }
function drawScorePopups() {
  for (let i=scorePopups.length-1;i>=0;i--) {
    const p=scorePopups[i]; p.y-=0.8; p.life--;
    if (p.life<=0) { scorePopups.splice(i,1); continue; }
    ctx.save(); ctx.globalAlpha=p.life/50; ctx.fillStyle='#ffcc00';
    ctx.font='bold 14px Courier New'; ctx.textAlign='center';
    ctx.fillText(`+${p.val}`,p.x,p.y); ctx.restore();
  }
}

