// ===== WAVE SHOP =====
let upgradePoints = 0;
let _lastScoreThreshold = 0;
let currentWaveUpgrades = []; // 今ウェーブで表示する3枠
let rerollsLeft = 2;
let shieldRechargeTimer = 0;
let shopPurchasedIds = new Set(); // 今回のショップで購入済みのID

const upgradeLevels = {
  // パッシブ
  firerate:0, movespeed:0, gauge:0, invincible:0, scoreBonus:0,
  bulletSpeed:0, damage:0, gaugeOnKill:0, magnet:0, ptBonus:0,
  bulletSize:0, gaugeCap:0, criticalHit:0,
  killHeal:0, luckyDrop:0, enemySlow:0, comboKill:0, enemyWeak:0,
  // 特殊能力
  multishot:0, homing:0, bombOnKill:0, shieldRecharge:0,
  specialPower:0, freezeOnHit:0, sideShot:0,
  chainKill:0, execute:0, orbitGuard:0,
};

const UPGRADES = [
  // ===== パッシブ =====
  {
    id:'firerate', name:'連射強化', symbol:'>>', tag:'passive',
    desc:'弾の発射間隔を短縮する',
    maxLevel:4, costs:[3,4,5,6],
    vals:['標準','−17%','−33%','−50%','−58%'],
  },
  {
    id:'movespeed', name:'移動速度', symbol:'=>', tag:'passive',
    desc:'プレイヤーの移動速度アップ',
    maxLevel:3, costs:[3,4,5],
    vals:['×1.0','×1.2','×1.4','×1.6'],
  },
  {
    id:'gauge', name:'ゲージ充填', symbol:'[+]', tag:'passive',
    desc:'スペシャルゲージの充填速度アップ',
    maxLevel:3, costs:[3,5,7],
    vals:['×1.0','×1.4','×2.0','×2.8'],
  },
  {
    id:'invincible', name:'無敵時間', symbol:'( )', tag:'passive',
    desc:'被弾後の無敵時間を延長する',
    maxLevel:3, costs:[3,4,5],
    vals:['2.0秒','2.7秒','3.3秒','4.0秒'],
  },
  {
    id:'scoreBonus', name:'スコア倍率', symbol:'**', tag:'passive',
    desc:'獲得スコアを倍率アップ',
    maxLevel:3, costs:[4,6,8],
    vals:['×1.0','×1.3','×1.6','×2.0'],
  },
  {
    id:'bulletSpeed', name:'弾速強化', symbol:'->', tag:'passive',
    desc:'弾の飛ぶ速度をアップ',
    maxLevel:3, costs:[3,5,6],
    vals:['×1.0','×1.4','×1.8','×2.3'],
  },
  {
    id:'damage', name:'攻撃力強化', symbol:'!!', tag:'passive',
    desc:'弾1発のダメージをアップ',
    maxLevel:3, costs:[5,7,9],
    vals:['1ダメ','2ダメ','3ダメ','4ダメ'],
  },
  {
    id:'gaugeOnKill', name:'ゲージ吸収', symbol:'(+)', tag:'passive',
    desc:'敵撃破時に追加ゲージを獲得',
    maxLevel:3, costs:[3,5,7],
    vals:['なし','+1','+3','+5'],
  },
  {
    id:'magnet', name:'アイテム吸引', symbol:'@', tag:'passive',
    desc:'アイテムを自動で引き寄せる',
    maxLevel:3, costs:[3,4,6],
    vals:['なし','近距離','中距離','広範囲'],
  },
  {
    id:'ptBonus', name:'PTボーナス', symbol:'$+', tag:'passive',
    desc:'ウェーブクリア時の獲得PTを増加',
    maxLevel:3, costs:[4,6,8],
    vals:['+0','+1','+2','+3'],
  },
  {
    id:'bulletSize', name:'弾サイズ', symbol:'(o)', tag:'passive',
    desc:'弾の当たり判定を拡大する',
    maxLevel:3, costs:[3,5,6],
    vals:['×1.0','×1.25','×1.5','×1.8'],
  },
  {
    id:'gaugeCap', name:'ゲージ短縮', symbol:'[-]', tag:'passive',
    desc:'特殊攻撃に必要なゲージ量を減少',
    maxLevel:3, costs:[4,6,8],
    vals:['100%','85%','70%','55%'],
  },
  {
    id:'criticalHit', name:'クリティカル', symbol:'!?', tag:'passive',
    desc:'一定確率で2倍ダメージ',
    maxLevel:3, costs:[5,7,9],
    vals:['なし','10%','20%','35%'],
  },
  // ===== 特殊能力（最大4種類） =====
  {
    id:'multishot', name:'マルチショット', symbol:'|||', tag:'ability',
    desc:'常時複数方向へ同時発射する',
    maxLevel:3, costs:[6,9,12],
    vals:['なし','2方向','3方向','4方向'],
  },
  {
    id:'homing', name:'ホーミング弾', symbol:'~>', tag:'ability',
    desc:'弾が近くの敵に向かって曲がる',
    maxLevel:3, costs:[5,7,9],
    vals:['なし','弱ホーミング','中ホーミング','強ホーミング'],
  },
  {
    id:'bombOnKill', name:'爆発連鎖', symbol:'*!*', tag:'ability',
    desc:'敵を倒した時、周囲に通常ダメージの50%を波及',
    maxLevel:3, costs:[4,6,8],
    vals:['なし','発動20%','発動40%','発動65%'],
  },
  {
    id:'shieldRecharge', name:'バリア充填', symbol:'[O]', tag:'ability',
    desc:'一定時間ごとにシールドが自動復活',
    maxLevel:3, costs:[4,6,8],
    vals:['なし','30秒ごと','20秒ごと','10秒ごと'],
  },
  {
    id:'specialPower', name:'特殊強化', symbol:'***', tag:'ability',
    desc:'特殊攻撃の弾数と威力を強化',
    maxLevel:3, costs:[5,8,11],
    vals:['24発/3dmg','36発/5dmg','48発/8dmg','64発/12dmg'],
  },
  {
    id:'freezeOnHit', name:'凍結付与', symbol:'*~', tag:'ability',
    desc:'弾が当たった敵を凍結させる',
    maxLevel:3, costs:[5,7,9],
    vals:['なし','15%','30%','50%'],
  },
  {
    id:'sideShot', name:'サイドショット', symbol:'<|>', tag:'ability',
    desc:'斜め・後方にも弾を発射する',
    maxLevel:3, costs:[4,6,8],
    vals:['なし','斜め2','斜め4','斜め+後'],
  },
  // ===== パッシブ（追加） =====
  {
    id:'killHeal', name:'吸収回復', symbol:'♥+', tag:'passive',
    desc:'敵撃破時に低確率でライフ回復',
    maxLevel:3, costs:[5,7,9],
    vals:['0%','1%','2%','3%'],
  },
  {
    id:'luckyDrop', name:'幸運のドロップ', symbol:'↓★', tag:'passive',
    desc:'敵からのアイテムドロップ率アップ',
    maxLevel:3, costs:[3,5,7],
    vals:['+0%','+4%','+8%','+12%'],
  },
  {
    id:'enemySlow', name:'スロウ弾', symbol:'~.', tag:'passive',
    desc:'弾が当たった敵の動きを鈍化',
    maxLevel:3, costs:[4,5,7],
    vals:['なし','−30%','−45%','−60%'],
  },
  {
    id:'comboKill', name:'コンボボーナス', symbol:'x2', tag:'passive',
    desc:'連続撃破でスコアボーナスが累積',
    maxLevel:3, costs:[4,6,8],
    vals:['なし','最大5','最大10','最大15'],
  },
  {
    id:'enemyWeak', name:'敵弾弱体化', symbol:'-.-', tag:'passive',
    desc:'敵の弾速を永続的に低下',
    maxLevel:3, costs:[3,5,7],
    vals:['×1.0','×0.88','×0.80','×0.72'],
  },
  // ===== 特殊能力（追加） =====
  {
    id:'chainKill', name:'連鎖雷撃', symbol:'⚡', tag:'ability',
    desc:'撃破時、近くの敵に雷が連鎖する',
    maxLevel:3, costs:[5,8,11],
    vals:['なし','1体','2体','3体'],
  },
  {
    id:'execute', name:'とどめの一撃', symbol:'X', tag:'ability',
    desc:'HPが低い敵へのダメージ大幅アップ',
    maxLevel:3, costs:[6,8,10],
    vals:['なし','+60%','+120%','+200%'],
  },
  {
    id:'orbitGuard', name:'衛星ガード', symbol:'< >', tag:'ability',
    desc:'左右の衛星機が敵を狙って射撃する',
    maxLevel:3, costs:[5,7,10],
    vals:['なし','1機','2機','3機'],
  },
];

// ----- wave shop stat getters -----
function getShootRate()       { return [12,10,8,6,5][upgradeLevels.firerate]; }
function getMoveSpeedMult()   { return [1.0,1.2,1.4,1.6][upgradeLevels.movespeed]; }
function getGaugeFillRate()   { return 0.012 * [1.0,1.4,2.0,2.8][upgradeLevels.gauge] * getPermGaugeBoostMult() * getPermCapacitorMult(); }
function getInvincibleFrames(){ return [120,160,200,240][upgradeLevels.invincible] + getPermInvBoostFrames(); }
function getScoreMult()       { return [1.0,1.3,1.6,2.0][upgradeLevels.scoreBonus] * getPermScoreMultFactor() * (1 + getPermScoreBonusPct()); }
function getBulletSpeedMult() { return [1.0,1.4,1.8,2.3][upgradeLevels.bulletSpeed] * getPermBulletSpdMult(); }
function getPlayerDamage()    { return [1,2,3,4][upgradeLevels.damage] + permLv('baseDamage'); }
function getHomingStrength()  {
  const shop = [0,0.12,0.25,0.45][upgradeLevels.homing];
  const perm = [0,0.08,0.14,0.20,0.28][permLv('permHoming')];
  return Math.min(0.95, shop + perm);
}
function getGaugeOnKill()     { return [0,1,3,5][upgradeLevels.gaugeOnKill] + getPermGaugeKillBonus(); }
function getEnemyGaugeGain(base) { return Math.max(1, Math.round((base || 6) * 0.32)); }
function getMagnetRadius()    { return [0,100,180,280][upgradeLevels.magnet] + getPermMagnetBonus(); }
function getPtBonus()         { return [0,1,2,3][upgradeLevels.ptBonus]; }
function getBulletSizeMult()  { return [1.0,1.25,1.5,1.8][upgradeLevels.bulletSize] * (1 + getPermBulletSizeBonus()); }
function getGaugeMax()        { return [100,85,70,55][upgradeLevels.gaugeCap]; }
function getCriticalChance()  { return Math.min(0.95, [0,0.10,0.20,0.35][upgradeLevels.criticalHit] + getPermCritBonus()); }
function getHealKillChance() {
  return getPermHealKillChance() + [0, 0.005, 0.01, 0.015, 0.02][permLv('permFortify')];
}
function getArmorMaxPerWave() {
  const lv = permLv('armor');
  if (lv <= 0) return 0;
  const cap = activeCharId === 'guardian' ? 3 : 2;
  return Math.min(lv, cap);
}
function getShopDiscount()    { return getPermShopDiscount(); }
function getRerollBonus()     { return getPermRerollBonus(); }

// ----- permanent upgrade stat getters (permLv = 適用Lv) -----
function getPermGaugeBoostMult() {
  const lv = permLv('gaugeBoost');
  if (activeCharId === 'volt') return [1.0, 1.8, 2.5, 3.5, 4.5][lv] || 1;
  return [1.0, 1.5, 2.0, 2.8, 3.5][lv] || 1;
}
function getPermInvBoostFrames() { return [0, 30, 60, 90, 120][permLv('invBoost')]; }
function getPermScoreMultFactor() { return [1.0, 1.2, 1.5, 2.0, 2.5][permLv('scoreMult')]; }
function getPermScoreBonusPct() { return [0, 0.10, 0.20, 0.28, 0.35][permLv('permScoreBonus')]; }
function getPermBulletSpdMult() { return [1.0, 1.2, 1.35, 1.5, 1.65][permLv('bulletSpd')]; }
function getPermGaugeKillBonus() { return [0, 1, 2, 4, 6][permLv('gaugeKill')]; }
function getPermMagnetBonus() { return [0, 60, 120, 180, 240][permLv('permMagnet')]; }
function getPermCritBonus() { return [0, 0.08, 0.15, 0.25, 0.35][permLv('permCrit')]; }
function getPermHealKillChance() { return [0, 0.005, 0.01, 0.02, 0.035][permLv('healKill')]; }
function getPermShopDiscount() { return [0, 1, 2, 3, 3][permLv('shopDiscount')]; }
function getPermRerollBonus() { return [0, 1, 2, 3, 3][permLv('rerollPlus')]; }
function getPermItemDropBonus() { return [0, 0.03, 0.06, 0.09, 0.12][permLv('itemDrop')]; }
function getPermBonusPts() { return permLv('bonusPts'); }
function getPermSpecialCooldownMs() {
  const lv = permLv('permSpecialCd');
  if (lv <= 0) return SPECIAL_COOLDOWN_MS;
  return [10000, 8500, 7000, 5500, 4000][lv];
}
function getPermOverchargeMult() { return [1, 1.15, 1.30, 1.45, 1.65][permLv('permOvercharge')]; }
function getPermWaveGaugeBonus() { return [0, 0.12, 0.25, 0.40, 0.55][permLv('permWaveCharge')]; }
function getPermShieldRegenInterval() {
  const lv = permLv('permRegen');
  if (lv <= 0) return 0;
  return [0, 2400, 1800, 1200, 800][lv];
}
function getPermOrbitStartCount() { return [0, 1, 2, 3, 3][permLv('permOrbitStart')]; }
function getPermBastionFrames() { return [0, 20, 40, 60, 90][permLv('permBastion')]; }
function getPermExecuteMult(hpRatio) {
  const lv = permLv('permExecute');
  if (lv <= 0) return 1;
  const threshold = [1, 0.40, 0.35, 0.30, 0.25][lv];
  if (hpRatio > threshold) return 1;
  return [1, 1.5, 2.0, 2.6, 3.2][lv];
}
function getPermChainTargets() { return [0, 1, 2, 3, 4][permLv('permChain')]; }
function getPermPierceCount() { return [0, 1, 2, 3, 4][Math.min(permLv('permPierce'), 4)]; }
function getPermBulletSizeBonus() { return [0, 0.15, 0.30, 0.45, 0.60][Math.min(permLv('permBulletSize'), 4)]; }
function getPermBossDamageMult() { return 1 + [0, 0.15, 0.30, 0.50, 0.70][Math.min(permLv('permBossHunter'), 4)]; }
function getPermComboBonusAdd() { return [0, 0.05, 0.10, 0.15, 0.20][Math.min(permLv('permComboMaster'), 4)]; }
function getPermFreezePermChance() { return [0, 0.10, 0.20, 0.30][Math.min(permLv('permFreezePerm'), 4)]; }
function getPermSalvageMult() { return 1 + [0, 0.08, 0.15, 0.22, 0.30][Math.min(permLv('permSalvage'), 4)]; }
function getPermWaveHealChance() { return [0, 0.05, 0.10, 0.15, 0.20][Math.min(permLv('permWaveHeal'), 4)]; }
function getPermCapacitorMult() { return 1 + [0, 0.10, 0.20, 0.30, 0.40][Math.min(permLv('permCapacitor'), 4)]; }
function getPermKillSpeedFrames() { return [0, 30, 60, 90, 120][Math.min(permLv('permKillSpeed'), 4)]; }
function getEffectiveShieldRechargeInterval() {
  const shop = getShieldRechargeInterval();
  const perm = getPermShieldRegenInterval();
  if (shop <= 0 && perm <= 0) return 0;
  if (shop <= 0) return perm;
  if (perm <= 0) return shop;
  return Math.min(shop, perm);
}
function getShieldRechargeInterval() { return [0,1800,1200,600][upgradeLevels.shieldRecharge]; }
function getStartGaugeRatio() {
  return [0, 0.25, 0.5, 0.75, 1.0][Math.min(permLv('startGauge'), 4)];
}
function getBigBombCountBonus() { return [0, 6, 12, 18, 24][permLv('bigBomb')]; }
function getBigBombDmgBonus() { return [0, 1, 3, 4, 6][permLv('bigBomb')]; }
function applyStartGaugeFill() {
  const ratio = getStartGaugeRatio();
  if (ratio > 0) specialGauge = getGaugeMax() * ratio;
}
function applyWaveStartBonuses() {
  const bonus = getPermWaveGaugeBonus() + [0, 0.08, 0.15, 0.22, 0.30][permLv('permWaveBonus')];
  if (bonus > 0) addGauge(getGaugeMax() * bonus);
  const wh = getPermWaveHealChance();
  if (wh > 0 && Math.random() < wh && lives < 4) {
    lives++;
    updateLivesUI();
    spawnParticles(player.x, player.y, 10, '#ff66aa', 3, 22);
  }
}
function getPermLuckyDropBonus() { return [0, 0.02, 0.04, 0.06, 0.08][permLv('permLucky')]; }
function getFreezeOnHitChance(){ return Math.min(0.75, [0,0.15,0.30,0.50][upgradeLevels.freezeOnHit] + getPermFreezePermChance()); }
function getFreezeOnHitDur()  { return [0,40,70,100][upgradeLevels.freezeOnHit]; }
function getShopDropBonus()   { return [0,0.04,0.08,0.12][upgradeLevels.luckyDrop]; }
function getKillHealChance()  {
  return Math.min(0.06, [0,0.01,0.02,0.03][upgradeLevels.killHeal] + getHealKillChance());
}
function getSlowMult()        { return [1,0.70,0.55,0.40][upgradeLevels.enemySlow]; }
function getSlowDuration()    { return [0,60,90,120][upgradeLevels.enemySlow]; }
function getComboCap()        { return [0,5,10,15][upgradeLevels.comboKill]; }
function getComboBonusRate()  { return [0,0.08,0.10,0.12][upgradeLevels.comboKill] + getPermComboBonusAdd(); }
function getEnemyBulletSpeedMult() { return [1,0.88,0.80,0.72][upgradeLevels.enemyWeak]; }
function getExecuteMult(hpRatio) {
  const lv = upgradeLevels.execute;
  let mult = 1;
  if (lv > 0 && hpRatio <= 0.35) mult = [1,1.6,2.2,3.0][lv];
  return mult * getPermExecuteMult(hpRatio);
}
function getChainTargets()    { return Math.max([0,1,2,3][upgradeLevels.chainKill], getPermChainTargets()); }
function getOrbitCount()      { return Math.min(3, [0,1,2,3][upgradeLevels.orbitGuard] + getPermOrbitStartCount()); }
function getOrbitGuardShootRate() { return [0, 50, 42, 36][upgradeLevels.orbitGuard]; }
function getOrbitGuardOffsets(count) {
  const slots = [
    { dx: -30, dy: 2 },
    { dx: 30, dy: 2 },
    { dx: 0, dy: 10 },
  ];
  return slots.slice(0, count);
}

// ----- combat helpers (orbit / special) -----
function findNearestEnemy(x, y, maxRange = 9999) {
  let nearest = null, best = maxRange * maxRange;
  for (const e of enemies) {
    if (e.type === 'stealth' && e.ghost) continue;
    if (e.type === 'boss' && e.invEntry) continue;
    const dx = e.x - x, dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; nearest = e; }
  }
  return nearest;
}
function shootOrbitGuardBullet(gx, gy, target) {
  if (bullets.length >= MAX_PLAYER_BULLETS) return;
  const bSpd = 10 * getBulletSpeedMult();
  const dmg = Math.max(1, Math.floor(getPlayerDamage() * 0.7));
  let vx = 0, vy = -bSpd;
  if (target) {
    const dx = target.x - gx, dy = target.y - gy;
    const len = Math.hypot(dx, dy) || 1;
    vx = dx / len * bSpd;
    vy = dy / len * bSpd;
  }
  bullets.push({
    x: gx, y: gy - 8,
    vx, vy,
    w: 2.5 * getBulletSizeMult(),
    h: 10 * getBulletSizeMult(),
    color: '#44ffaa',
    player: true,
    damage: dmg,
    homing: false,
  });
  spawnParticles(gx, gy - 10, 2, '#66ffcc', 2, 8);
}
function getSpecialCount() {
  const base = [28,36,48,64][upgradeLevels.specialPower];
  return base + getBigBombCountBonus();
}
function getSpecialDamage() {
  const base = [3,5,8,12][upgradeLevels.specialPower];
  return base + getBigBombDmgBonus();
}
function getSpecialBulletSpeed() { return 14; }
function getSpecialBulletLife()  { return 55; }
function getSideShotAngles() {
  const lv = Math.max(upgradeLevels.sideShot, permLv('permSideShot'));
  if (lv <= 0) return [];
  if (lv === 1) return [-0.45, 0.45];
  if (lv === 2) return [-0.85, -0.45, 0.45, 0.85];
  if (lv === 3) return [-0.85, -0.45, 0.45, 0.85, Math.PI];
  return [-1.0, -0.85, -0.45, 0.45, 0.85, 1.0, Math.PI];
}

// ----- ability purchase cap -----
const MAX_ABILITY_TYPES = 4;
function getActiveAbilityCount() {
  return UPGRADES.filter(u => u.tag === 'ability' && upgradeLevels[u.id] > 0).length;
}
function isAbilityAtCap() { return getActiveAbilityCount() >= MAX_ABILITY_TYPES; }
function canBuyAbility(id) {
  const upg = UPGRADES.find(u => u.id === id);
  if (!upg || upg.tag !== 'ability') return true;
  if (upgradeLevels[id] > 0) return true;
  return !isAbilityAtCap();
}
function canBuyThisShop(id) {
  return !shopPurchasedIds.has(id);
}
function updateAbilityCapUI() {
  const el = document.getElementById('abilityCapDisplay');
  if (!el) return;
  const n = getActiveAbilityCount();
  el.textContent = `特殊能力 ${n}/${MAX_ABILITY_TYPES}`;
  el.classList.toggle('full', n >= MAX_ABILITY_TYPES);
}
function getMultiDirectionLevel() {
  const fromBuild = Math.min(upgradeLevels.multishot + permLv('startMulti'), 4);
  // MULTIアイテム = 最低3方向。永続/ショップより弱い場合のみ底上げ
  const fromPup = player.powerups.multishot > 0 ? 2 : 0;
  return Math.min(4, Math.max(fromBuild, fromPup));
}

const MULTI_ANGLE_TABLE = [
  [],
  [-0.28, 0.28],
  [-0.3, 0, 0.3],
  [-0.35, -0.12, 0.12, 0.35],
  [-0.4, -0.2, 0, 0.2, 0.4],
];

function getMultiShotAngles() {
  const angles = MULTI_ANGLE_TABLE[getMultiDirectionLevel()];
  return angles.length > 0 ? angles : [0];
}

function getPermMultiAngles() {
  // ショップ表示用（パワーアップは含めない）
  const total = Math.min(upgradeLevels.multishot + permLv('startMulti'), 4);
  return MULTI_ANGLE_TABLE[total];
}

// 永続込みの実効値ラベルを返すヘルパー
const PERM_INTERACT = {
  // shop upgrade id → { getEffVal(shopLv): string }
  multishot: {
    getEffVal(shopLv) {
      const dirLabels = ['単発','2方向','3方向','4方向','5方向'];
      const total = Math.min(shopLv + permLv('startMulti'), 4);
      return dirLabels[total];
    },
  },
  damage: {
    getEffVal(shopLv) {
      const total = [1,2,3,4][shopLv] + permLv('baseDamage');
      return `${total}ダメ`;
    },
  },
  bulletSpeed: {
    getEffVal(shopLv) {
      const total = ([1.0,1.4,1.8,2.3][shopLv] * getPermBulletSpdMult()).toFixed(2);
      return `×${total}`;
    },
  },
  gauge: {
    getEffVal(shopLv) {
      const total = ([1.0,1.4,2.0,2.8][shopLv] * getPermGaugeBoostMult()).toFixed(1);
      return `×${total}`;
    },
  },
  scoreBonus: {
    getEffVal(shopLv) {
      const total = ([1.0,1.3,1.6,2.0][shopLv] * getPermScoreMultFactor() * (1 + getPermScoreBonusPct())).toFixed(2);
      return `×${total}`;
    },
  },
  specialPower: {
    getEffVal(shopLv) {
      const counts = [28, 36, 48, 64];
      const dmg = [3, 5, 8, 12];
      const total = counts[shopLv] + getBigBombCountBonus();
      const d = dmg[shopLv] + getBigBombDmgBonus();
      return `${total}発/${d}dmg`;
    },
  },
  sideShot: {
    getEffVal(shopLv) {
      const lv = Math.max(shopLv, permLv('permSideShot'));
      const labels = ['なし','左右','4方向','5方向+後方','7方向'];
      return labels[Math.min(lv, 4)];
    },
  },
  homing: {
    getEffVal(shopLv) {
      const v = getHomingStrength();
      return v > 0 ? `追尾${(v * 100).toFixed(0)}%` : 'なし';
    },
  },
};
function getStartPowerupDuration(id) {
  const lv = permLv(id);
  if (lv <= 0) return 0;
  return [0, 600, 1200, 1800, 2400][Math.min(lv, 4)];
}

// ----- wave shop UI -----
function isUpgradeAvailable(u) {
  if (upgradeLevels[u.id] >= u.maxLevel) return false;
  if (u.tag === 'ability' && upgradeLevels[u.id] === 0 && isAbilityAtCap()) return false;
  return true;
}

// ----- wave upgrade selection -----
function pickWaveUpgrades() {
  const available = UPGRADES.filter(isUpgradeAvailable);
  const pool = available.length >= 3 ? available : available;
  // 特殊能力(ability)は出にくくする: passiveは重み3、abilityは重み1
  const weighted = [];
  pool.forEach(u => {
    const w = u.tag === 'ability' ? 1 : 3;
    for (let i = 0; i < w; i++) weighted.push(u);
  });
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  // 重複除去して4枚選出
  const seen = new Set();
  currentWaveUpgrades = shuffled.filter(u => {
    if (seen.has(u.id)) return false;
    seen.add(u.id); return true;
  }).slice(0, 4);
}

function doReroll() {
  if (rerollsLeft <= 0 || upgradePoints < 1) return;
  upgradePoints--;
  rerollsLeft--;
  shopPurchasedIds = new Set();
  document.getElementById('upgradePointsDisplay').textContent = upgradePoints;
  pickWaveUpgrades(); // 再選出
  renderUpgradeGrid();
  document.getElementById('rerollsLeft').textContent = `残り${rerollsLeft}回`;
  document.getElementById('rerollBtn').disabled = rerollsLeft <= 0 || upgradePoints < 1;
}

function awardPoints(isBoss) {
  const earned = (isBoss ? 3 : 1) + getPermBonusPts() + getPtBonus();
  upgradePoints += earned;
  return earned;
}

function getUpgradeCost(upg, lv) {
  return Math.max(1, upg.costs[lv] - getShopDiscount());
}

function showUpgradeScreen(isBoss) {
  if (debugMode) {
    level++;
    lastWasBossKill = false;
    spawnWave();
    showLevelText();
    document.getElementById('levelDisplay').textContent = level;
    return;
  }
  state = 'upgrade';
  bullets.length = 0;
  enemyBullets.length = 0;
  rerollsLeft = 2 + getRerollBonus();
  shopPurchasedIds = new Set();
  pickWaveUpgrades();
  const earned = awardPoints(isBoss);
  document.getElementById('upgWaveInfo').textContent = isBoss ? 'BOSS CLEAR !' : 'WAVE CLEAR !';
  const badge = document.getElementById('upgEarnedBadge');
  badge.textContent = `+${earned} PT 獲得`;
  badge.classList.remove('upg-pts-earned-anim');
  void badge.offsetWidth;
  badge.classList.add('upg-pts-earned-anim');
  document.getElementById('upgradePointsDisplay').textContent = upgradePoints;
  document.getElementById('rerollsLeft').textContent = `残り${rerollsLeft}回`;
  const rBtn = document.getElementById('rerollBtn');
  rBtn.disabled = rerollsLeft <= 0 || upgradePoints < 1;
  renderUpgradeGrid();
  updateAbilityCapUI();
  updateTouchControlsVisibility();
  ScreenUI.open('upgrade');
  Sfx.play(isBoss ? 'bossClear' : 'waveClear', true);
  ScreenUI.scheduleContextHint('shop');
}

function renderUpgradeGrid() {
  const grid = document.getElementById('upgradeGrid');
  grid.innerHTML = '';
  currentWaveUpgrades.forEach(upg => {
    const lv = upgradeLevels[upg.id];
    const maxed = lv >= upg.maxLevel;
    const cost = maxed ? 0 : getUpgradeCost(upg, lv);
    const canAfford = upgradePoints >= cost;
    const boughtThisShop = shopPurchasedIds.has(upg.id);
    const abilityBlocked = upg.tag === 'ability' && lv === 0 && isAbilityAtCap();
    const canBuy = !maxed && !boughtThisShop && canAfford && canBuyAbility(upg.id);

    const card = document.createElement('div');
    card.className = 'upg-card' + (maxed ? ' maxed' : '') + (abilityBlocked || boughtThisShop ? ' locked' : '');

    const pips = Array.from({length: upg.maxLevel}, (_, i) =>
      `<div class="upg-pip${i < lv ? (maxed ? ' on gold' : ' on') : ''}"></div>`
    ).join('');

    // 永続連動がある場合は実効値を表示、なければ通常vals
    const pi = PERM_INTERACT[upg.id];
    const currVal = pi ? pi.getEffVal(lv) : upg.vals[lv];
    const nextVal = pi ? pi.getEffVal(lv + 1) : (upg.vals[lv + 1] || '');
    const valStr  = maxed ? currVal : `${currVal} → ${nextVal}`;

    const costLabel = maxed ? '-- MAX --' : boughtThisShop ? '今回購入済' : abilityBlocked ? '特殊能力上限' : cost + ' PT';
    const btnLabel  = maxed ? 'MAX' : boughtThisShop ? '今回購入済' : abilityBlocked ? '上限' : `購入 (${cost}PT)`;

    card.innerHTML = `
      <div class="upg-tag ${upg.tag}">${upg.tag === 'ability' ? '特殊能力' : 'パッシブ'}</div>
      <div class="upg-symbol">${upg.symbol}</div>
      <div class="upg-name">${upg.name}</div>
      <div class="upg-desc">${upg.desc}</div>
      <div class="upg-curr-val">${valStr}</div>
      <div class="upg-pips">${pips}</div>
      <div class="upg-cost">${costLabel}</div>
      <button class="upg-buy${maxed ? ' is-maxed' : ''}"
        ${!canBuy ? 'disabled' : ''}
        data-id="${upg.id}">
        ${btnLabel}
      </button>`;

    if (!maxed && !abilityBlocked && !boughtThisShop) {
      card.querySelector('.upg-buy').addEventListener('click', () => buyUpgrade(upg.id));
    }
    grid.appendChild(card);
  });
}

function buyUpgrade(id) {
  const upg = UPGRADES.find(u => u.id === id);
  if (!upg) return;
  const lv = upgradeLevels[id];
  if (lv >= upg.maxLevel) return;
  const cost = getUpgradeCost(upg, lv);
  if (upgradePoints < cost) return;
  if (!canBuyAbility(id)) return;
  if (!canBuyThisShop(id)) return;
  upgradePoints -= cost;
  upgradeLevels[id]++;
  shopPurchasedIds.add(id);
  // shieldRechargeタイマー初期化
  if (id === 'shieldRecharge' && shieldRechargeTimer === 0) {
    shieldRechargeTimer = getEffectiveShieldRechargeInterval();
  }
  document.getElementById('upgradePointsDisplay').textContent = upgradePoints;
  // rerollボタンの有効化状態を更新
  document.getElementById('rerollBtn').disabled = rerollsLeft <= 0 || upgradePoints < 1;
  renderUpgradeGrid();
  updateAbilityCapUI();
  Sfx.play('upgrade', true);
}

document.getElementById('rerollBtn').addEventListener('click', () => { Sfx.play('ui', true); doReroll(); });

function continueToNextWave() {
  ScreenUI.dismissHint(true);
  ScreenUI.close('upgrade');
  state = 'playing';
  resetTouchStick();
  touchInput.fire = false;
  updateTouchControlsVisibility();
  permArmorUsed = 0;
  applyWaveStartBonuses();
  const isBoss = level % 3 === 0;
  if (isBoss) spawnBoss(); else spawnWave();
  level++;
  showLevelText();
}

document.getElementById('continueBtn').addEventListener('click', () => { Sfx.play('ui', true); continueToNextWave(); });

