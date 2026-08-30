// ===== WAVE SHOP (definitions, getters, UI) =====
let upgradePoints = 0;
let _lastScoreThreshold = 0;
let currentWaveUpgrades = []; // 今ウェーブで表示する3枠
let rerollsLeft = 2;
let shieldRechargeTimer = 0;
let shopPurchasedIds = new Set(); // 今回のショップで購入済みのID
let forbiddenOffer = null; // FORBIDDEN_CARDS の1件 | null
let forbiddenOwned = {}; // id -> 0|1（各禁断カード MAX 1）
let forbiddenRunClaimed = false; // このランで禁断を1枚でも購入したら以降出現しない

const FORBIDDEN_CHANCE = 0.01;
const FORBIDDEN_MIN_WAVE = 4;

const FORBIDDEN_CARDS = [
  {
    id: 'fb_overdrive',
    name: '過負荷連射',
    symbol: '>>>',
    desc: '弾幕を極限まで加速。通常強化の限界を超える',
    effectLabel: '発射間隔 3F（最速）',
    cost: 16,
  },
  {
    id: 'fb_annihilation',
    name: '終焉の火力',
    symbol: '!!!',
    desc: '1発に破壊的ダメージを宿す',
    effectLabel: '攻撃力 +4',
    cost: 18,
  },
  {
    id: 'fb_apocalypse',
    name: '天崩の弾雨',
    symbol: '***',
    desc: '全方位5方向弾＋強力追尾を即時獲得',
    effectLabel: '5方向 + 追尾80%',
    cost: 20,
  },
  {
    id: 'fb_reaper',
    name: '死神の裁き',
    symbol: 'XX',
    desc: '体力が半分以上残っていても処刑する',
    effectLabel: 'HP60%以下で ×4',
    cost: 17,
  },
  {
    id: 'fb_void_aegis',
    name: '虚空の盾',
    symbol: '[O]',
    desc: 'シールドを付与し、8秒ごとに自動再生',
    effectLabel: 'シールド常時＋自動再生',
    cost: 19,
  },
  {
    id: 'fb_domination',
    name: '支配の刻印',
    symbol: '%%',
    desc: '敵を弱体化し、スコア獲得を大幅に増幅',
    effectLabel: '敵弱体 + スコア×1.6',
    cost: 15,
  },
];

function hasForbidden(id) {
  return (forbiddenOwned[id] || 0) >= 1;
}

function resetForbiddenForRun() {
  forbiddenOwned = {};
  forbiddenRunClaimed = false;
  forbiddenOffer = null;
}

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
function getShootRate() {
  if (hasForbidden('fb_overdrive')) return 3;
  return [12,10,8,6,5][upgradeLevels.firerate];
}
function getMoveSpeedMult()   { return [1.0,1.2,1.4,1.6][upgradeLevels.movespeed]; }
function getGaugeFillRate()   { return 0.012 * [1.0,1.4,2.0,2.8][upgradeLevels.gauge] * getPermGaugeBoostMult() * getPermCapacitorMult(); }
function getInvincibleFrames(){ return [120,160,200,240][upgradeLevels.invincible] + getPermInvBoostFrames(); }
function getScoreMult() {
  let mult = [1.0,1.3,1.6,2.0][upgradeLevels.scoreBonus] * getPermScoreMultFactor() * (1 + getPermScoreBonusPct());
  if (hasForbidden('fb_domination')) mult *= 1.6;
  return mult;
}
function getBulletSpeedMult() { return [1.0,1.4,1.8,2.3][upgradeLevels.bulletSpeed] * getPermBulletSpdMult(); }
function getPlayerDamage() {
  let dmg = [1,2,3,4][upgradeLevels.damage] + permLv('baseDamage');
  if (hasForbidden('fb_annihilation')) dmg += 4;
  return dmg;
}
function getHomingStrength()  {
  if (hasForbidden('fb_apocalypse')) return Math.max(0.8, getHomingStrengthBase());
  return getHomingStrengthBase();
}
function getHomingStrengthBase() {
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

function getEffectiveShieldRechargeInterval() {
  const forbidden = hasForbidden('fb_void_aegis') ? 480 : 0;
  const shop = getShieldRechargeInterval();
  const perm = getPermShieldRegenInterval();
  const vals = [forbidden, shop, perm].filter(v => v > 0);
  if (vals.length === 0) return 0;
  return Math.min(...vals);
}
function getShieldRechargeInterval() { return [0,1800,1200,600][upgradeLevels.shieldRecharge]; }
function applyWaveStartBonuses() {
  const bonus = getPermWaveGaugeBonus() + [0, 0.08, 0.15, 0.22, 0.30][permLv('permWaveBonus')];
  if (bonus > 0) addGauge(getGaugeMax() * bonus);
  const wh = getPermWaveHealChance();
  if (wh > 0 && Math.random() < wh && lives < getMaxLives()) {
    lives++;
    updateLivesUI();
    spawnParticles(player.x, player.y, 10, '#ff66aa', 3, 22);
  }
}
function getFreezeOnHitChance(){ return Math.min(0.75, [0,0.15,0.30,0.50][upgradeLevels.freezeOnHit] + getPermFreezePermChance()); }
function getFreezeOnHitDur()  { return [0,40,70,100][upgradeLevels.freezeOnHit]; }
function getShopDropBonus()   { return [0,0.04,0.08,0.12][upgradeLevels.luckyDrop]; }
function getKillHealChance()  {
  return Math.min(0.06, [0,0.01,0.02,0.03][upgradeLevels.killHeal] + getHealKillChance());
}
function getSlowMult() {
  if (hasForbidden('fb_domination')) return Math.min(0.5, [1,0.70,0.55,0.40][upgradeLevels.enemySlow]);
  return [1,0.70,0.55,0.40][upgradeLevels.enemySlow];
}
function getSlowDuration()    { return [0,60,90,120][upgradeLevels.enemySlow]; }
function getComboCap()        { return [0,5,10,15][upgradeLevels.comboKill]; }
function getComboBonusRate()  { return [0,0.08,0.10,0.12][upgradeLevels.comboKill] + getPermComboBonusAdd(); }
function getEnemyBulletSpeedMult() {
  if (hasForbidden('fb_domination')) {
    return Math.min(0.55, [1,0.88,0.80,0.72][upgradeLevels.enemyWeak]);
  }
  return [1,0.88,0.80,0.72][upgradeLevels.enemyWeak];
}
function getExecuteMult(hpRatio) {
  if (hasForbidden('fb_reaper') && hpRatio <= 0.6) {
    return 4 * getPermExecuteMult(hpRatio);
  }
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
  if (hasForbidden('fb_apocalypse')) return 4;
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
  const total = Math.min(upgradeLevels.multishot + permLv('startMulti'), 4);
  return MULTI_ANGLE_TABLE[total];
}

// 永続込みの実効値ラベル（ショップ UI 用）
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
// ----- wave shop UI -----
function isUpgradeAvailable(u) {
  if (upgradeLevels[u.id] >= u.maxLevel) return false;
  if (u.tag === 'ability' && upgradeLevels[u.id] === 0 && isAbilityAtCap()) return false;
  return true;
}

// ----- wave upgrade selection -----
function pickWaveUpgrades() {
  const pool = UPGRADES.filter(isUpgradeAvailable);
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

function pickForbiddenOffer() {
  forbiddenOffer = null;
  if (forbiddenRunClaimed) return;
  if (level < FORBIDDEN_MIN_WAVE) return;
  if (Math.random() >= FORBIDDEN_CHANCE) return;

  const pool = FORBIDDEN_CARDS.filter(c => !hasForbidden(c.id));
  if (pool.length === 0) return;
  forbiddenOffer = pool[Math.floor(Math.random() * pool.length)];
}

function getForbiddenCost(card) {
  const mult = getPlayDifficulty().shopCostMult || 1;
  return Math.ceil(card.cost * mult);
}

function applyForbiddenImmediate(card) {
  if (card.id === 'fb_void_aegis') {
    player.powerups.shield = 1;
    const iv = getEffectiveShieldRechargeInterval();
    if (iv > 0) shieldRechargeTimer = iv;
  }
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
  const base = Math.max(1, upg.costs[lv] - getShopDiscount());
  const mult = getPlayDifficulty().shopCostMult || 1;
  return Math.ceil(base * mult);
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
  Achievements.onWaveClear(level, isBoss);
  state = 'upgrade';
  bullets.length = 0;
  enemyBullets.length = 0;
  rerollsLeft = 2 + getRerollBonus();
  shopPurchasedIds = new Set();
  pickWaveUpgrades();
  if (!forbiddenRunClaimed) {
    forbiddenOffer = null;
    pickForbiddenOffer();
  }
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
  renderForbiddenCard();
}

function renderForbiddenCard() {
  const slot = document.getElementById('forbiddenCardSlot');
  if (!slot) return;
  slot.innerHTML = '';
  slot.classList.add('hidden');
  if (!forbiddenOffer || forbiddenRunClaimed) return;

  const card = forbiddenOffer;
  const cost = getForbiddenCost(card);
  const canAfford = upgradePoints >= cost;
  const canBuy = canAfford;

  slot.classList.remove('hidden');
  slot.innerHTML = `
    <div class="upg-forbidden-label">⚠ 禁断の1枚 ⚠ <span class="upg-forbidden-note">出現率1% · ラン中1回限り</span></div>
    <div class="upg-card forbidden${canBuy ? '' : ' locked'}">
      <div class="upg-tag forbidden">禁断 · MAX 1</div>
      <div class="upg-symbol">${card.symbol}</div>
      <div class="upg-name">${card.name}</div>
      <div class="upg-desc">${card.desc}</div>
      <div class="upg-curr-val">${card.effectLabel}</div>
      <div class="upg-pips"><div class="upg-pip on gold"></div></div>
      <div class="upg-cost">${cost} PT</div>
      <button class="upg-buy forbidden-buy" ${canBuy ? '' : 'disabled'} data-forbidden="1">禁断を購入 (${cost}PT)</button>
    </div>`;

  if (canBuy) {
    slot.querySelector('.forbidden-buy')?.addEventListener('click', () => buyForbiddenUpgrade());
  }
}

function buyForbiddenUpgrade() {
  if (!forbiddenOffer || forbiddenRunClaimed) return;
  const card = forbiddenOffer;
  const cost = getForbiddenCost(card);
  if (upgradePoints < cost || hasForbidden(card.id)) return;

  upgradePoints -= cost;
  forbiddenOwned[card.id] = 1;
  forbiddenRunClaimed = true;
  forbiddenOffer = null;
  applyForbiddenImmediate(card);

  document.getElementById('upgradePointsDisplay').textContent = upgradePoints;
  document.getElementById('rerollBtn').disabled = rerollsLeft <= 0 || upgradePoints < 1;
  renderUpgradeGrid();
  updateAbilityCapUI();
  Sfx.play('bossClear', true);
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
  recordHardWaveProgress();
  showLevelText();
}

document.getElementById('continueBtn').addEventListener('click', () => { Sfx.play('ui', true); continueToNextWave(); });

