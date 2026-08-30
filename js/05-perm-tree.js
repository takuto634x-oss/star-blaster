// ===== PERMANENT UPGRADE TREE (definitions) =====
/*
  4ブランチ × 複数ティア。pos は ptTreePan 内座標（720×620、中心 360,310）。
  req が同じノードから複数の子が分岐する。
  Branch 0=生存(NW) 1=攻撃(NE) 2=成長(SE) 3=ゲージ(SW)
*/
const PERM_TREE_BASE = [
  // ── 生存 (NW, branch:0) ──
  { id:'extraLife',  branch:0, pos:[267,217], maxLevel:2, costs:[3,5],
    name:'初期ライフ+', symbol:'♥',
    desc:'開始ライフ+1（Lv2で+2）',
    req:null, vals:['なし','+1','+2'] },
  { id:'startShield',branch:0, pos:[156,187],  maxLevel:2, costs:[4,6],
    name:'シールド装備', symbol:'[♥]',
    desc:'開始時シールド所持（Lv2で無敵時間も延長）',
    req:'extraLife', vals:['なし','シールド装備','シールド+無敵延長'] },
  { id:'armor',      branch:0, pos:[237,106],  maxLevel:2, costs:[5,7],
    name:'アーマー', symbol:'◇',
    desc:'各ウェーブで被弾を1〜2回無効',
    req:'extraLife', vals:['なし','1回','2回'] },

  // ── 攻撃 (NE, branch:1) ──
  { id:'baseDamage', branch:1, pos:[453,217], maxLevel:3, costs:[3,5,7],
    name:'基礎攻撃力', symbol:'!!',
    desc:'弾の基礎ダメージ+1/+2/+3',
    req:null, vals:['+0','+1','+2','+3'] },
  { id:'startMulti', branch:1, pos:[564,187], maxLevel:2, costs:[5,8],
    name:'マルチ装備', symbol:'|||',
    desc:'開始時からマルチショット（Lv2で3方向）',
    req:'baseDamage', vals:['なし','2方向','3方向'] },
  { id:'bigBomb',    branch:1, pos:[483,106],  maxLevel:2, costs:[8,10],
    name:'スペシャル強化', symbol:'★',
    desc:'スペシャル弾数・威力を永続強化',
    req:'baseDamage', vals:['なし','+6発/+1dmg','+12発/+3dmg'] },

  // ── 成長 (SE, branch:2) ──
  { id:'bonusPts',   branch:2, pos:[453,403], maxLevel:3, costs:[2,3,4],
    name:'報酬PT+', symbol:'+PT',
    desc:'ウェーブ報酬ポイント+1/+2/+3',
    req:null, vals:['+0','+1','+2','+3'] },
  { id:'scoreMult',  branch:2, pos:[564,433], maxLevel:3, costs:[4,5,6],
    name:'スコア倍率', symbol:'×S',
    desc:'獲得スコア×1.2/×1.5/×2.0倍',
    req:'bonusPts', vals:['×1.0','×1.2','×1.5','×2.0'] },
  { id:'itemDrop',   branch:2, pos:[483,514], maxLevel:2, costs:[5,8],
    name:'ドロップ率+', symbol:'↓⬟',
    desc:'アイテムドロップ率+3%/+6%',
    req:'bonusPts', vals:['+0%','+3%','+6%'] },

  // ── ゲージ (SW, branch:3) ──
  { id:'gaugeBoost', branch:3, pos:[267,403], maxLevel:3, costs:[3,4,5],
    name:'ゲージ加速', symbol:'[+]',
    desc:'ゲージ充填速度×1.5/×2.0/×3.0',
    req:null, vals:['×1.0','×1.5','×2.0','×3.0'] },
  { id:'startGauge', branch:3, pos:[156,433],  maxLevel:2, costs:[4,6],
    name:'ゲージ充填', symbol:'[▮]',
    desc:'開始時ゲージ50%（Lv2で100%）',
    req:'gaugeBoost', vals:['0%','50%','100%'] },
  { id:'startLaser', branch:3, pos:[237,514], maxLevel:2, costs:[6,9],
    name:'レーザー装備', symbol:'≋',
    desc:'開始時レーザー所持（Lv2で持続2倍）',
    req:'gaugeBoost', vals:['なし','レーザー装備','レーザー2倍持続'] },

  // ── tier3 ──
  { id:'invBoost', branch:0, pos:[87,136], maxLevel:3, costs:[4,6,8],
    name:'無敵延長', symbol:'( )',
    desc:'被弾後の無敵時間を永続延長',
    req:'startShield', vals:['+0秒','+0.5秒','+1.0秒','+1.5秒'] },
  { id:'healKill', branch:0, pos:[293,81], maxLevel:3, costs:[6,8,10],
    name:'撃破回復', symbol:'♥+',
    desc:'敵撃破時に低確率でライフ回復',
    req:'armor', vals:['0%','0.5%','1%','2%'] },
  { id:'bulletSpd', branch:1, pos:[636,136], maxLevel:2, costs:[5,8],
    name:'弾速強化', symbol:'->',
    desc:'弾速を永続アップ',
    req:'startMulti', vals:['×1.0','×1.2','×1.35'] },
  { id:'permCrit', branch:1, pos:[585,81], maxLevel:3, costs:[6,8,10],
    name:'会心の極意', symbol:'!?',
    desc:'クリティカル率を永続追加',
    req:'bigBomb', vals:['+0%','+8%','+15%','+25%'] },
  { id:'permMagnet', branch:2, pos:[585,578], maxLevel:2, costs:[5,7],
    name:'磁石', symbol:'@',
    desc:'常時アイテムを引き寄せる',
    req:'itemDrop', vals:['なし','弱','強'] },
  { id:'shopDiscount', branch:2, pos:[636,477], maxLevel:2, costs:[6,9],
    name:'割引券', symbol:'-$',
    desc:'ショップ購入コストを永続軽減',
    req:'scoreMult', vals:['-0','-1PT','-2PT'] },
  { id:'permScoreBonus', branch:2, pos:[662,390], maxLevel:2, costs:[5,7],
    name:'スコアボーナス', symbol:'S+',
    desc:'獲得スコアをさらに増加',
    req:'scoreMult', vals:['+0%','+10%','+20%'] },
  { id:'gaugeKill', branch:3, pos:[87,491], maxLevel:3, costs:[4,5,7],
    name:'撃破充填', symbol:'(+)',
    desc:'敵撃破時の追加ゲージを永続増加',
    req:'startGauge', vals:['+0','+1','+2','+4'] },
  { id:'startRapid', branch:3, pos:[163,585], maxLevel:2, costs:[5,8],
    name:'ラピッド装備', symbol:'>>',
    desc:'開始時ラピッドファイア所持',
    req:'startLaser', vals:['なし','10秒','20秒'] },
  { id:'rerollPlus', branch:3, pos:[315,585], maxLevel:2, costs:[6,9],
    name:'リロール+', symbol:'↺',
    desc:'ショップのシャッフル回数を増加',
    req:'startLaser', vals:['+0','+1回','+2回'] },

  // ── tier4（高コスト永続） ──
  { id:'permPierce', branch:1, pos:[520, 35], maxLevel:3, costs:[14, 19, 26],
    name:'貫通弾', symbol:'→→',
    desc:'通常弾が敵を貫通',
    req:'bigBomb', vals:['なし','+1体','+2体','+3体'] },
  { id:'permBulletSize', branch:1, pos:[410, 35], maxLevel:3, costs:[9, 13, 17],
    name:'巨弾化', symbol:'◉',
    desc:'弾サイズを永続拡大',
    req:'bulletSpd', vals:['×1.0','×1.15','×1.30','×1.45'] },
  { id:'permBossHunter', branch:1, pos:[660, 35], maxLevel:3, costs:[12, 17, 23],
    name:'ボス狩り', symbol:'B',
    desc:'ボスへのダメージ永続UP',
    req:'permCrit', vals:['+0%','+15%','+30%','+50%'] },
  { id:'permComboMaster', branch:2, pos:[700, 520], maxLevel:3, costs:[8, 12, 16],
    name:'コンボ極意', symbol:'C×',
    desc:'コンボボーナス率を永続UP',
    req:'shopDiscount', vals:['+0%','+5%','+10%','+15%'] },
  { id:'permFreezePerm', branch:3, pos:[350, 620], maxLevel:3, costs:[10, 14, 18],
    name:'冷気付与', symbol:'❄',
    desc:'弾が敵を凍らせる確率を永続追加',
    req:'gaugeKill', vals:['0%','+10%','+20%','+30%'] },
];

const PERM_BLASTER_EXTRA = [
  { id:'permHoming', branch:1, pos:[695, 200], maxLevel:4, costs:[5,7,9,11],
    name:'追尾適性', symbol:'◎',
    desc:'永続ホーミング強度UP（バランス型）',
    req:'bulletSpd', vals:['+0%','+8%','+14%','+20%','+28%'] },
  { id:'permFortify', branch:0, pos:[25, 200], maxLevel:4, costs:[5,7,9,11],
    name:'不屈', symbol:'■',
    desc:'撃破回復率をさらに永続追加',
    req:'healKill', vals:['+0%','+0.5%','+1%','+1.5%','+2%'] },
  { id:'permLucky', branch:2, pos:[695, 555], maxLevel:4, costs:[5,7,9,11],
    name:'幸運', symbol:'☆',
    desc:'アイテムドロップ率をさらにUP',
    req:'permMagnet', vals:['+0%','+2%','+4%','+6%','+8%'] },
  { id:'permWaveBonus', branch:3, pos:[25, 555], maxLevel:4, costs:[5,7,9,11],
    name:'先制充填', symbol:'▲',
    desc:'ウェーブ開始時にゲージを追加充填',
    req:'rerollPlus', vals:['+0%','+8%','+15%','+22%','+30%'] },
  { id:'permSalvage', branch:2, pos:[350, 620], maxLevel:3, costs:[8, 11, 15],
    name:'サルベージ', symbol:'$+',
    desc:'撃破スコアを永続増加',
    req:'permLucky', vals:['+0%','+8%','+15%','+22%'] },
];

const PERM_GUARDIAN_EXTRA = [
  { id:'permRegen', branch:0, pos:[25, 120], maxLevel:4, costs:[4,6,8,10],
    name:'シールド再生', symbol:'↻',
    desc:'シールド破壊後に自動再生（防御特化）',
    req:'startShield', vals:['なし','遅','中','速','最速'] },
  { id:'permBastion', branch:0, pos:[350, 25], maxLevel:4, costs:[5,7,9,11],
    name:'バスティオン', symbol:'⬡',
    desc:'アーマー発動時の無敵時間延長',
    req:'invBoost', vals:['+0F','+20F','+40F','+60F','+90F'] },
  { id:'permOrbitStart', branch:0, pos:[120, 25], maxLevel:4, costs:[6,8,10,12],
    name:'衛星展開', symbol:'< >',
    desc:'開始時から衛星ガードを展開',
    req:'armor', vals:['なし','1機','2機','3機','3機強化'] },
  { id:'permWaveHeal', branch:0, pos:[200, 620], maxLevel:3, costs:[9, 13, 17],
    name:'ウェーブ治癒', symbol:'+♥',
    desc:'ウェーブ開始時に低確率でライフ+1',
    req:'permRegen', vals:['0%','5%','10%','15%'] },
];

const PERM_STRIKER_EXTRA = [
  { id:'permExecute', branch:1, pos:[695, 25], maxLevel:4, costs:[5,7,9,11],
    name:'処刑人', symbol:'X',
    desc:'低HP敵への永続とどめダメージ（火力特化）',
    req:'permCrit', vals:['なし','+50%','+100%','+160%','+220%'] },
  { id:'permChain', branch:1, pos:[695, 120], maxLevel:4, costs:[6,8,10,12],
    name:'連鎖雷撃', symbol:'⚡',
    desc:'撃破時の連鎖対象数を永続追加',
    req:'bigBomb', vals:['+0','+1','+2','+3','+4'] },
  { id:'permSideShot', branch:1, pos:[636, 25], maxLevel:4, costs:[5,7,9,11],
    name:'サイド砲', symbol:'↔',
    desc:'左右方向への永続サイドショット',
    req:'bulletSpd', vals:['なし','左右','4方向','5方向','7方向'] },
  { id:'permKillSpeed', branch:1, pos:[520, 620], maxLevel:3, costs:[11, 15, 20],
    name:'キルレースト', symbol:'»',
    desc:'撃破後しばらく連射速度UP',
    req:'permChain', vals:['なし','短','中','長'] },
];

const PERM_VOLT_EXTRA = [
  { id:'permSpecialCd', branch:3, pos:[25, 620], maxLevel:4, costs:[5,7,9,11],
    name:'SP短縮', symbol:'⏱',
    desc:'スペシャルクールダウン短縮（エネルギー特化）',
    req:'gaugeKill', vals:['10秒','8.5秒','7秒','5.5秒','4秒'] },
  { id:'permOvercharge', branch:3, pos:[120, 620], maxLevel:4, costs:[6,8,10,12],
    name:'オーバーチャージ', symbol:'⚡',
    desc:'満タンSP発動時の威力UP',
    req:'startGauge', vals:['×1.0','×1.15','×1.30','×1.45','×1.65'] },
  { id:'permWaveCharge', branch:3, pos:[220, 620], maxLevel:4, costs:[5,7,9,11],
    name:'波状充填', symbol:'〜',
    desc:'ウェーブ開始時にゲージを大量充填',
    req:'startLaser', vals:['+0%','+12%','+25%','+40%','+55%'] },
  { id:'permCapacitor', branch:3, pos:[350, 650], maxLevel:3, costs:[9, 13, 17],
    name:'コンデンサ', symbol:'⚡+',
    desc:'ゲージ自然充填を永続強化',
    req:'permWaveCharge', vals:['+0%','+10%','+20%','+30%'] },
];

function buildCharTree(base, { patch = {}, extra = [] } = {}) {
  const nodes = base.map(n => {
    const p = patch[n.id];
    if (!p) return { ...n };
    return { ...n, ...p, costs: p.costs ?? n.costs, vals: p.vals ?? n.vals };
  });
  return nodes.concat(extra);
}

const PERM_TREES = {
  blaster: buildCharTree(PERM_TREE_BASE, {
    patch: {
      baseDamage: { maxLevel:4, costs:[3,5,7,9], vals:['+0','+1','+2','+3','+4'], desc:'基礎攻撃力（バランス型・最大+4）' },
      bonusPts: { maxLevel:4, costs:[2,3,4,5], vals:['+0','+1','+2','+3','+4'] },
      scoreMult: { maxLevel:4, costs:[4,5,6,7], vals:['×1.0','×1.2','×1.5','×2.0','×2.5'] },
      gaugeBoost: { maxLevel:4, costs:[3,4,5,6], vals:['×1.0','×1.5','×2.0','×2.8','×3.5'] },
    },
    extra: PERM_BLASTER_EXTRA,
  }),
  guardian: buildCharTree(PERM_TREE_BASE, {
    patch: {
      extraLife: { maxLevel:4, costs:[2,3,5,7], vals:['+0','+1','+2','+3','+4'], desc:'開始ライフ強化（防御特化・最大+4）' },
      startShield: { maxLevel:4, costs:[3,4,6,8], vals:['なし','シールド','+無敵延長','+再生準備','+最大防御'], desc:'シールド装備（防御特化）' },
      armor: { maxLevel:4, costs:[4,5,7,9], vals:['なし','1回','2回','3回','3回+強化'], desc:'各ウェーブの被弾無効（最大3回）' },
      invBoost: { maxLevel:4, costs:[3,5,7,9], vals:['+0秒','+0.5秒','+1.0秒','+1.5秒','+2.0秒'] },
      healKill: { maxLevel:4, costs:[5,6,8,10], vals:['0%','0.5%','1%','2%','3.5%'] },
      baseDamage: { costs:[5,7,9] },
      bigBomb: { costs:[10,12] },
      startMulti: { costs:[7,10] },
    },
    extra: PERM_GUARDIAN_EXTRA,
  }),
  striker: buildCharTree(PERM_TREE_BASE, {
    patch: {
      baseDamage: { maxLevel:4, costs:[2,4,6,8], vals:['+0','+1','+2','+3','+4'], desc:'基礎攻撃力（火力特化・最大+4）' },
      startMulti: { maxLevel:4, costs:[4,6,8,10], vals:['なし','2方向','3方向','4方向','5方向'] },
      bigBomb: { maxLevel:4, costs:[6,8,10,12], vals:['なし','+6発/+1dmg','+12発/+3dmg','+18発/+4dmg','+24発/+6dmg'], desc:'スペシャル強化（火力特化）' },
      bulletSpd: { maxLevel:4, costs:[4,6,8,10], vals:['×1.0','×1.2','×1.35','×1.5','×1.65'] },
      permCrit: { maxLevel:4, costs:[5,7,9,11], vals:['+0%','+8%','+15%','+25%','+35%'] },
      permPierce: { maxLevel:4, costs:[12, 16, 21, 28], vals:['なし','+1体','+2体','+3体','+4体'], desc:'貫通弾（火力特化・最大4体）' },
      permBossHunter: { maxLevel:4, costs:[10, 14, 18, 24], vals:['+0%','+15%','+30%','+50%','+70%'] },
      extraLife: { costs:[4,6] },
      startShield: { costs:[6,8] },
      gaugeBoost: { costs:[4,5,6] },
    },
    extra: PERM_STRIKER_EXTRA,
  }),
  volt: buildCharTree(PERM_TREE_BASE, {
    patch: {
      gaugeBoost: { maxLevel:4, costs:[2,3,4,5], vals:['×1.0','×1.8','×2.5','×3.5','×4.5'], desc:'ゲージ加速（エネルギー特化）' },
      startGauge: { maxLevel:4, costs:[3,4,5,7], vals:['0%','25%','50%','75%','100%'], desc:'開始時ゲージ充填（最大100%）' },
      gaugeKill: { maxLevel:4, costs:[3,4,5,7], vals:['+0','+1','+2','+4','+6'] },
      startLaser: { maxLevel:4, costs:[5,7,9,11], vals:['なし','10秒','20秒','30秒','40秒'] },
      startRapid: { maxLevel:4, costs:[5,7,9,11], vals:['なし','10秒','20秒','30秒','40秒'] },
      bigBomb: { maxLevel:4, costs:[6,8,10,12], vals:['なし','+6発/+1dmg','+12発/+3dmg','+18発/+4dmg','+24発/+6dmg'], desc:'SP強化（ヴォルト特化）' },
      rerollPlus: { maxLevel:4, costs:[6,8,10,12], vals:['+0','+1回','+2回','+3回','+3回'] },
      baseDamage: { costs:[5,7,9] },
    },
    extra: PERM_VOLT_EXTRA,
  }),
};

const CHARACTERS = [
  {
    id: 'blaster', name: 'ブラスター', symbol: '✦',
    desc: 'バランス型。4系統すべて4/4まで伸ばせる万能ツリー。',
    cost: 0, color: '#88ccff', glow: 'rgba(0,160,255,0.55)',
    branchLabels: ['生存', '攻撃', '成長', 'ゲージ'],
  },
  {
    id: 'guardian', name: 'ガーディアン', symbol: '♦',
    desc: '防御特化。生存系4/4＋シールド再生・衛星展開。',
    cost: 12, color: '#44ffaa', glow: 'rgba(0,200,100,0.55)',
    branchLabels: ['防御', '反撃', '資源', '充能'],
  },
  {
    id: 'striker', name: 'ストライカー', symbol: '▲',
    desc: '火力特化。攻撃系4/4＋貫通・処刑・連鎖・キルレースト。',
    cost: 12, color: '#ff8844', glow: 'rgba(255,100,40,0.55)',
    branchLabels: ['耐久', '火力', '賞金', 'SP'],
  },
  {
    id: 'volt', name: 'ヴォルト', symbol: '⚡',
    desc: 'ゲージ特化。SP系4/4＋CD短縮・オーバーチャージ。',
    cost: 15, color: '#cc66ff', glow: 'rgba(180,60,255,0.55)',
    branchLabels: ['装甲', '出力', '効率', 'エネルギー'],
  },
];

// ===== PERMANENT UPGRADE TREE (runtime) =====
const PERM_STORAGE_KEY = 'starblaster_perm_v5';

// ----- perm state -----
let permPoints = 0;
let activeCharId = 'blaster';
let ownedChars = ['blaster'];
const charPermData = { blaster: {} };
const charPermActiveData = { blaster: {} };
const permLevels = {};
const permActiveLevels = {};
let permArmorUsed = 0;

function getActiveCharacter() {
  return CHARACTERS.find(c => c.id === activeCharId) || CHARACTERS[0];
}
function getActivePermTree() {
  return PERM_TREES[activeCharId] || PERM_TREES.blaster;
}
function permOwned(id) { return permLevels[id] || 0; }
function permLv(id) {
  const owned = permOwned(id);
  if (owned <= 0) return 0;
  if (permActiveLevels[id] !== undefined) return Math.min(Math.max(0, permActiveLevels[id]), owned);
  return owned;
}

function setPermActiveLevel(id, active) {
  const owned = permOwned(id);
  if (owned <= 0) return;
  const next = Math.min(Math.max(0, active), owned);
  if (next >= owned) delete permActiveLevels[id];
  else permActiveLevels[id] = next;
  flushPermActiveToChar(activeCharId);
  savePerm();
  renderPermTree();
  Sfx.play('ui', true);
}

// ----- perm stat getters (適用Lv = permLv) -----
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
function getStartGaugeRatio() {
  return [0, 0.25, 0.5, 0.75, 1.0][Math.min(permLv('startGauge'), 4)];
}
function getBigBombCountBonus() { return [0, 6, 12, 18, 24][permLv('bigBomb')]; }
function getBigBombDmgBonus() { return [0, 1, 3, 4, 6][permLv('bigBomb')]; }
function applyStartGaugeFill() {
  const ratio = getStartGaugeRatio();
  if (ratio > 0) specialGauge = getGaugeMax() * ratio;
}
function getPermLuckyDropBonus() { return [0, 0.02, 0.04, 0.06, 0.08][permLv('permLucky')]; }
function getStartPowerupDuration(id) {
  const lv = permLv(id);
  if (lv <= 0) return 0;
  return [0, 600, 1200, 1800, 2400][Math.min(lv, 4)];
}

// ----- perm persistence -----
function flushPermLevelsToChar(charId) {
  if (!charPermData[charId]) charPermData[charId] = {};
  const tree = PERM_TREES[charId] || PERM_TREES.blaster;
  tree.forEach(u => {
    if (permLevels[u.id]) charPermData[charId][u.id] = permLevels[u.id];
    else delete charPermData[charId][u.id];
  });
}

function flushPermActiveToChar(charId) {
  if (!charPermActiveData[charId]) charPermActiveData[charId] = {};
  const tree = PERM_TREES[charId] || PERM_TREES.blaster;
  tree.forEach(u => {
    const owned = charPermData[charId]?.[u.id] || permLevels[u.id] || 0;
    const active = permActiveLevels[u.id];
    if (owned > 0 && active !== undefined && active < owned) charPermActiveData[charId][u.id] = active;
    else delete charPermActiveData[charId][u.id];
  });
}

function syncPermLevelsFromChar(charId) {
  Object.keys(permLevels).forEach(k => delete permLevels[k]);
  const data = charPermData[charId] || {};
  (PERM_TREES[charId] || PERM_TREES.blaster).forEach(u => {
    permLevels[u.id] = Math.min(data[u.id] || 0, u.maxLevel);
  });
}

function syncPermActiveFromChar(charId) {
  Object.keys(permActiveLevels).forEach(k => delete permActiveLevels[k]);
  const data = charPermActiveData[charId] || {};
  (PERM_TREES[charId] || PERM_TREES.blaster).forEach(u => {
    const owned = permOwned(u.id);
    if (owned <= 0) return;
    let active = data[u.id];
    if (active === undefined) active = owned;
    active = Math.min(Math.max(0, active), owned);
    if (active < owned) permActiveLevels[u.id] = active;
  });
}

function loadPerm() {
  if (CloudSync.isEnabled() && CloudSync.hasLoadedAccount()) {
    CloudSync.applyPermToGame();
    return;
  }
  if (!activeProfileId) return;
  try {
    const raw = localStorage.getItem(profileStorageKey(PERM_STORAGE_KEY)) || '{}';
    const d = JSON.parse(raw);
    if (d.chars) {
      permPoints = d.pts || 0;
      activeCharId = d.activeChar || 'blaster';
      ownedChars = d.owned || ['blaster'];
      Object.keys(charPermData).forEach(k => delete charPermData[k]);
      Object.assign(charPermData, d.chars || { blaster: {} });
    } else {
      permPoints = d.pts || 0;
      activeCharId = 'blaster';
      ownedChars = ['blaster'];
      charPermData.blaster = {};
      PERM_TREE_BASE.forEach(u => { if (d[u.id]) charPermData.blaster[u.id] = d[u.id]; });
    }
    if (!ownedChars.includes(activeCharId)) activeCharId = ownedChars[0] || 'blaster';
    CHARACTERS.forEach(c => {
      if (!charPermData[c.id]) charPermData[c.id] = {};
      if (!charPermActiveData[c.id]) charPermActiveData[c.id] = {};
    });
    if (d.charActive) Object.assign(charPermActiveData, d.charActive);
    syncPermLevelsFromChar(activeCharId);
    syncPermActiveFromChar(activeCharId);
  } catch (e) {}
}

function savePerm() {
  flushPermLevelsToChar(activeCharId);
  flushPermActiveToChar(activeCharId);
  const payload = {
    pts: permPoints, activeChar: activeCharId, owned: ownedChars, chars: charPermData, charActive: charPermActiveData,
  };
  if (CloudSync.isEnabled() && activeProfileId) {
    CloudSync.setPermPayload(payload);
    CloudSync.scheduleSave();
    return;
  }
  if (!activeProfileId) return;
  localStorage.setItem(profileStorageKey(PERM_STORAGE_KEY), JSON.stringify(payload));
}

// ツリー中心座標・キャンバスサイズ
const PT_CANVAS_W = 720, PT_CANVAS_H = 620;
const PT_CX = 360, PT_CY = 310;
// ブランチラベル配置（各ブランチの外側）
const PT_LABEL_POS = [
  [87, 96],    // 生存 (NW)
  [597, 94],   // 攻撃 (NE)
  [595, 517],  // 成長 (SE)
  [83, 517],   // ゲージ (SW)
];

let ptPanX = 0, ptPanY = 0;
let ptPanDrag = null;

function getPtTreeScale() {
  if (!isTouchDevice()) return 1;
  const area = document.getElementById('ptTreeArea');
  if (!area) return 1;
  const rect = area.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return 1;
  return Math.min(1, (rect.width * 0.96) / PT_CANVAS_W, (rect.height * 0.96) / PT_CANVAS_H);
}

function applyPtPan() {
  const pan = document.getElementById('ptTreePan');
  const s = getPtTreeScale();
  if (pan) {
    pan.style.transformOrigin = '0 0';
    pan.style.transform = `translate(${ptPanX}px, ${ptPanY}px) scale(${s})`;
  }
}

function centerPtTreeView() {
  const area = document.getElementById('ptTreeArea');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  const s = getPtTreeScale();
  ptPanX = rect.width / 2 - PT_CX * s;
  ptPanY = rect.height / 2 - PT_CY * s;
  applyPtPan();
}

function initPtTreePan() {
  const area = document.getElementById('ptTreeArea');
  if (!area || area._ptPanInit) return;
  area._ptPanInit = true;

  area.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('.pt-node, .pt-node-wrap, .pt-equip-btn, button')) return;
    ptPanDrag = {
      pid: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: ptPanX,
      panY: ptPanY,
    };
    area.setPointerCapture(e.pointerId);
    area.classList.add('pt-dragging');
  });

  area.addEventListener('pointermove', (e) => {
    if (!ptPanDrag || e.pointerId !== ptPanDrag.pid) return;
    ptPanX = ptPanDrag.panX + (e.clientX - ptPanDrag.startX);
    ptPanY = ptPanDrag.panY + (e.clientY - ptPanDrag.startY);
    applyPtPan();
  });

  const endPan = (e) => {
    if (!ptPanDrag || e.pointerId !== ptPanDrag.pid) return;
    ptPanDrag = null;
    area.classList.remove('pt-dragging');
    try { area.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  area.addEventListener('pointerup', endPan);
  area.addEventListener('pointercancel', endPan);
}

// ツリーノードのタップ
function bindPtNodeTap(el, onTap) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    el._ptTapStart = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    const s = el._ptTapStart;
    if (!s) return;
    el._ptTapStart = null;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) return;
    onTap(e);
  });
}

function buildCharCenterNode(ch) {
  const cnDiv = document.createElement('div');
  cnDiv.className = 'pt-node char-node';
  cnDiv.style.left = PT_CX + 'px';
  cnDiv.style.top = PT_CY + 'px';
  cnDiv.style.borderColor = ch.color;
  cnDiv.style.boxShadow = `0 0 30px ${ch.glow}, 0 0 60px ${ch.glow}`;
  cnDiv.style.background = `radial-gradient(circle at 40% 35%, ${ch.color}55, rgba(0,10,60,0.95))`;
  cnDiv.innerHTML =
    `<div class="pt-node-symbol" style="font-size:26px;color:${ch.color}">${ch.symbol}</div>` +
    `<div class="pt-node-name" style="color:rgba(220,240,255,0.9);font-size:8px;letter-spacing:1px">${ch.name}</div>` +
    `<div class="pt-char-hint">タップで変更</div>`;
  bindPtNodeTap(cnDiv, () => openCharSelect());
  return cnDiv;
}

// ブランチ別カラー設定
const PT_BRANCH_COLORS = [
  { base:'#44ff88', dim:'rgba(40,180,90,0.5)',  glow:'rgba(0,255,100,0.35)',  label:'生存',  labelColor:'rgba(80,230,130,0.75)' },
  { base:'#ff7744', dim:'rgba(200,90,50,0.5)',   glow:'rgba(255,100,40,0.35)',  label:'攻撃',  labelColor:'rgba(255,140,80,0.75)' },
  { base:'#4499ff', dim:'rgba(50,100,220,0.5)',  glow:'rgba(40,140,255,0.35)', label:'成長',  labelColor:'rgba(80,170,255,0.75)' },
  { base:'#cc66ff', dim:'rgba(140,50,220,0.5)',  glow:'rgba(180,60,255,0.35)', label:'ゲージ', labelColor:'rgba(200,100,255,0.75)' },
];

// ----- perm tree rendering -----
function renderPermTree() {
  const pan  = document.getElementById('ptTreePan');
  const svg  = document.getElementById('ptSvg');
  const ch   = getActiveCharacter();
  const tree = getActivePermTree();
  svg.innerHTML = '';
  pan.querySelectorAll('.pt-node-wrap, .pt-branch-label').forEach(el => el.remove());

  const nodeById = {};
  tree.forEach(u => { nodeById[u.id] = u; });

  // SVG defs
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML = `
    <filter id="glow-bright"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow-dim"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.appendChild(defs);

  function svgLine(x1,y1,x2,y2,stroke,width,dash,filter) {
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke',stroke); line.setAttribute('stroke-width',width);
    if (dash) line.setAttribute('stroke-dasharray','5 5');
    if (filter) line.setAttribute('filter',`url(#${filter})`);
    svg.appendChild(line);
  }

  // req を元に親位置を決定してライン描画（分岐対応）
  tree.forEach(u => {
    const nx = u.pos[0], ny = u.pos[1];
    const px = u.req ? nodeById[u.req].pos[0] : PT_CX;
    const py = u.req ? nodeById[u.req].pos[1] : PT_CY;
    const pathUnlocked = !u.req || permOwned(u.req) >= 1;
    const owned = permOwned(u.id);
    const bc = PT_BRANCH_COLORS[u.branch];

    if (owned >= u.maxLevel) {
      svgLine(px,py,nx,ny, bc.base, 4, false, 'glow-bright');
      svgLine(px,py,nx,ny, 'rgba(255,255,255,0.3)', 1.5, false, null);
    } else if (owned >= 1) {
      svgLine(px,py,nx,ny, bc.base, 2.5, false, 'glow-dim');
    } else if (pathUnlocked) {
      svgLine(px,py,nx,ny, bc.dim, 2, false, 'glow-dim');
    } else {
      svgLine(px,py,nx,ny, 'rgba(50,60,100,0.35)', 1.5, true, null);
    }
  });

  // ブランチラベル（固定座標）
  PT_BRANCH_COLORS.forEach((bc, bi) => {
    const [lx, ly] = PT_LABEL_POS[bi];
    const el = document.createElement('div');
    el.className = 'pt-branch-label';
    el.style.left = lx+'px'; el.style.top = ly+'px';
    el.style.color = bc.labelColor;
    el.style.fontSize = '9px';
    el.style.letterSpacing = '2px';
    el.textContent = ch.branchLabels[bi] || bc.label;
    pan.appendChild(el);
  });

  const tip = document.getElementById('ptTooltip');

  tree.forEach(u => {
    const owned     = permOwned(u.id);
    const active    = permLv(u.id);
    const isMax     = owned >= u.maxLevel;
    const reqOk     = !u.req || permOwned(u.req) >= 1;
    const nextCost  = isMax ? 0 : u.costs[owned];
    const canAfford = permPoints >= nextCost;
    const bc        = PT_BRANCH_COLORS[u.branch];

    let cls = 'pt-node ';
    if (isMax)           cls += 'unlocked';
    else if (!reqOk)     cls += 'locked';
    else if (!canAfford) cls += 'cant-afford';
    else                 cls += 'available';

    const wrap = document.createElement('div');
    wrap.className = 'pt-node-wrap';
    wrap.style.left = u.pos[0]+'px';
    wrap.style.top  = u.pos[1]+'px';

    const div = document.createElement('div');
    div.className = cls;

    // ブランチカラーをボーダー・グローに反映
    if (isMax) {
      div.style.borderColor = bc.base;
      div.style.boxShadow = `0 0 18px ${bc.glow}, 0 0 6px ${bc.base}44`;
    } else if (owned > 0) {
      div.style.borderColor = bc.dim;
      div.style.boxShadow = `0 0 10px ${bc.glow}`;
    } else if (reqOk) {
      div.style.borderColor = canAfford ? bc.dim : 'rgba(60,80,160,0.4)';
    }

    // pip表示（●●○）= 所持Lv
    const pips = Array.from({length: u.maxLevel}, (_, i) =>
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 1px;` +
      `background:${i < owned ? bc.base : 'rgba(255,255,255,0.1)'};` +
      `border:1px solid ${i < owned ? bc.base : 'rgba(255,255,255,0.18)'};` +
      `${i < active ? '' : i < owned ? 'opacity:0.45;' : ''}"></span>`
    ).join('');

    const lvStr   = `所持 ${owned}/${u.maxLevel}`;
    const costStr = isMax ? 'MAX' : !reqOk ? '🔒' : `${nextCost}PT`;

    div.innerHTML =
      `<div class="pt-node-symbol" style="${owned>0?`color:${bc.base};text-shadow:0 0 8px ${bc.glow}`:''};font-size:18px">${u.symbol}</div>` +
      `<div class="pt-node-name">${u.name}</div>` +
      `<div style="margin:1px 0">${pips}</div>` +
      `<div class="pt-node-cost" style="font-size:8px;line-height:1.2">${lvStr}</div>` +
      `<div class="pt-node-cost" style="font-size:7.5px;color:${isMax?'#44ffaa':reqOk&&canAfford?'#ffcc00':'rgba(150,130,80,0.7)'}">${costStr}</div>`;

    // ホバーツールチップ
    div.addEventListener('mouseenter', () => {
      if (!tip) return;
      tip.className = '';
      const currVal  = u.vals ? `<div style="color:rgba(180,210,255,0.7);font-size:9px;margin-top:2px">適用中: ${u.vals[active]}</div>` : '';
      const ownedVal = u.vals && owned > 0 ? `<div style="color:rgba(150,190,255,0.65);font-size:9px">所持最大: ${u.vals[owned]}</div>` : '';
      const nextVal  = u.vals && !isMax ? `<div style="color:#88ffcc;font-size:9px">次の購入: ${u.vals[owned+1]}</div>` : '';
      const costInfo = !isMax && reqOk ? `<div style="color:${canAfford?'#ffcc00':'rgba(180,130,50,0.7)'};font-size:9px;margin-top:3px">${nextCost} PT 必要</div>` : '';
      const lockInfo = !reqOk ? `<div style="color:rgba(200,100,100,0.8);font-size:9px;margin-top:3px">🔒 前のノードLv1が必要</div>` : '';
      const doneInfo = isMax  ? `<div style="color:#44ffaa;font-size:9px;margin-top:3px">✓ MAX取得済み</div>` : '';
      const equipInfo = owned > 0 ? `<div style="color:rgba(160,210,255,0.8);font-size:9px;margin-top:3px">適用 ${active}/${owned}（＋－で変更）</div>` : '';
      tip.innerHTML = `<div style="font-weight:bold;color:${bc.labelColor};letter-spacing:1px;margin-bottom:2px">${u.name}</div>${u.desc}${currVal}${ownedVal}${nextVal}${equipInfo}${costInfo}${lockInfo}${doneInfo}`;
      const tx = u.pos[0] > PT_CX ? u.pos[0] - 178 : u.pos[0] + 44;
      const ty = Math.max(8, Math.min(u.pos[1] - 30, PT_CANVAS_H - 50));
      tip.style.left = tx+'px'; tip.style.top = ty+'px';
    });
    div.addEventListener('mouseleave', () => { if(tip) tip.className='hidden'; });

    if (!isMax && reqOk && canAfford) {
      bindPtNodeTap(div, () => buyPermUpgrade(u.id));
    }

    wrap.appendChild(div);

    if (owned > 0) {
      const equip = document.createElement('div');
      equip.className = 'pt-equip-row';
      equip.innerHTML =
        `<span class="pt-equip-tag">適用</span>` +
        `<button type="button" class="pt-equip-btn" data-d="-1" ${active <= 0 ? 'disabled' : ''}>−</button>` +
        `<span class="pt-equip-label">${active}/${owned}</span>` +
        `<button type="button" class="pt-equip-btn" data-d="1" ${active >= owned ? 'disabled' : ''}>＋</button>`;
      equip.addEventListener('pointerdown', e => e.stopPropagation());
      equip.addEventListener('click', e => {
        e.stopPropagation();
        const btn = e.target.closest('.pt-equip-btn');
        if (!btn || btn.disabled) return;
        setPermActiveLevel(u.id, active + parseInt(btn.dataset.d, 10));
      });
      wrap.appendChild(equip);
    }

    pan.appendChild(wrap);
  });

  pan.appendChild(buildCharCenterNode(ch));

  if (tip) tip.className = 'hidden';
  document.getElementById('ptTotal').textContent = permPoints;
  const titleEl = document.getElementById('ptCharTitle');
  if (titleEl) titleEl.textContent = ch.name;
}

function buyPermUpgrade(id) {
  const u = getActivePermTree().find(x => x.id === id);
  const owned = permOwned(id);
  if (!u || owned >= u.maxLevel) return;
  if (u.req && permOwned(u.req) < 1) return;
  const cost = u.costs[owned];
  if (permPoints < cost) return;
  permPoints -= cost;
  permLevels[id] = owned + 1;
  delete permActiveLevels[id];
  savePerm();
  Achievements.onPermBuy();
  // 購入フラッシュ
  const area = document.getElementById('ptTreeArea');
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,180,255,0.08);border-radius:4px;pointer-events:none;animation:ptFlash 0.35s ease-out forwards;z-index:1';
  area.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
  renderPermTree();
  Sfx.play('permUpgrade', true);
}
// フラッシュアニメ (styleタグに動的追加)
if (!document.getElementById('ptFlashStyle')) {
  const s = document.createElement('style');
  s.id = 'ptFlashStyle';
  s.textContent = '@keyframes ptFlash{0%{opacity:1}100%{opacity:0}}';
  document.head.appendChild(s);
}

// ----- character select -----
function openCharSelect() {
  document.getElementById('charSelectPts').textContent = permPoints;
  renderCharSelect();
  document.getElementById('charSelectOverlay').classList.remove('hidden');
}

function closeCharSelect() {
  document.getElementById('charSelectOverlay').classList.add('hidden');
}

function renderCharSelect() {
  const grid = document.getElementById('charSelectGrid');
  grid.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const owned = ownedChars.includes(ch.id);
    const active = ch.id === activeCharId;
    const card = document.createElement('div');
    card.className = 'char-card' + (active ? ' active' : '') + (!owned ? ' locked' : '');

    let btnHtml;
    if (active) {
      btnHtml = '<button class="char-card-btn select" disabled>使用中</button>';
    } else if (owned) {
      btnHtml = '<button class="char-card-btn select">選択する</button>';
    } else if (permPoints >= ch.cost) {
      btnHtml = `<button class="char-card-btn buy">${ch.cost} PT で購入</button>`;
    } else {
      btnHtml = `<button class="char-card-btn buy" disabled>${ch.cost} PT（不足）</button>`;
    }

    card.innerHTML =
      `<div class="char-card-symbol" style="color:${ch.color}">${ch.symbol}</div>` +
      `<div class="char-card-name">${ch.name}</div>` +
      `<div class="char-card-desc">${ch.desc}</div>${btnHtml}`;

    const btn = card.querySelector('.char-card-btn');
    if (btn && !btn.disabled) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (owned) selectCharacter(ch.id);
        else buyCharacter(ch.id);
      });
    }
    grid.appendChild(card);
  });
  document.getElementById('charSelectPts').textContent = permPoints;
}

function selectCharacter(charId) {
  if (!ownedChars.includes(charId) || charId === activeCharId) return;
  flushPermLevelsToChar(activeCharId);
  flushPermActiveToChar(activeCharId);
  activeCharId = charId;
  syncPermLevelsFromChar(charId);
  syncPermActiveFromChar(charId);
  savePerm();
  renderPermTree();
  centerPtTreeView();
  renderCharSelect();
}

function buyCharacter(charId) {
  const ch = CHARACTERS.find(c => c.id === charId);
  if (!ch || ownedChars.includes(charId) || permPoints < ch.cost) return;
  permPoints -= ch.cost;
  ownedChars.push(charId);
  charPermData[charId] = charPermData[charId] || {};
  charPermActiveData[charId] = charPermActiveData[charId] || {};
  flushPermLevelsToChar(activeCharId);
  flushPermActiveToChar(activeCharId);
  activeCharId = charId;
  syncPermLevelsFromChar(charId);
  syncPermActiveFromChar(charId);
  savePerm();
  Achievements.onCharBuy();
  renderPermTree();
  centerPtTreeView();
  renderCharSelect();
  document.getElementById('ptTotal').textContent = permPoints;
}

// ----- perm tree screen -----
function showPermTree(earnedPts = 0, hubMode = false) {
  ScreenUI.dismissHint(true);
  ScreenUI.close('title');
  ScreenUI.open('permTree');
  document.getElementById('ptGameoverLabel').classList.toggle('hidden', hubMode);
  document.getElementById('ptRunInfo').classList.toggle('hidden', hubMode);
  const earnedEl = document.getElementById('ptEarned');
  earnedEl.classList.toggle('hidden', hubMode || earnedPts <= 0);
  if (!hubMode && earnedPts > 0) earnedEl.textContent = `+${earnedPts} PT`;
  document.getElementById('ptLevel').textContent = level;
  document.getElementById('ptScore').textContent = score.toLocaleString();
  const runInfo = document.getElementById('ptRunInfo');
  if (runInfo && !hubMode) {
    runInfo.innerHTML = `LEVEL <span id="ptLevel">${level}</span> 到達 &nbsp;—&nbsp; ${getPlayDifficulty().label} &nbsp;—&nbsp; スコア <span id="ptScore">${score.toLocaleString()}</span>`;
  }
  document.getElementById('ptTotal').textContent = permPoints;
  document.getElementById('ptStartBtn').textContent = hubMode ? 'ゲームを始める ▶' : '新しいゲームを始める ▶';
  state = hubMode ? 'title' : 'permTree';
  setTimeout(() => { renderPermTree(); centerPtTreeView(); }, 30);
  if (!hubMode) ScreenUI.scheduleContextHint('perm');
}

function openPermHub() {
  if (!activeProfileId) { openProfileOverlay(true); return; }
  showPermTree(0, true);
}

function returnToTitleFromPermTree() {
  ScreenUI.onLeavePermTree(false);
  closeCharSelect();
  ScreenUI.close('permTree');
  ScreenUI.close('upgrade');
  ScreenUI.open('title');
  document.getElementById('overlayTitle').textContent = 'STAR BLASTER';
  document.getElementById('overlaySub').textContent = 'PUSH START';
  document.getElementById('overlayScore').classList.add('hidden');
  document.getElementById('overlayHighscore').classList.add('hidden');
  document.getElementById('startBtn').textContent = 'スタート';
  state = 'title';
  resetTouchStick();
  touchInput.fire = false;
  updateTouchControlsVisibility();
}

// ===== PERM HUB (events) =====
const PermHub = {
  init() {
    initPtTreePan();
    document.getElementById('charSelectClose')?.addEventListener('click', closeCharSelect);
    document.getElementById('ptCharBtn')?.addEventListener('click', openCharSelect);
    document.getElementById('permHubBtn')?.addEventListener('click', openPermHub);
    document.getElementById('ptTitleBtn')?.addEventListener('click', returnToTitleFromPermTree);
    document.getElementById('ptStartBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      openDifficultySelect('permTree');
    });
    document.getElementById('charSelectOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'charSelectOverlay') closeCharSelect();
    });
  },
};

