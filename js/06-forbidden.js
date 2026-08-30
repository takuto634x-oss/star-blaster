// ===== FORBIDDEN SHOP CARD (1% rare offer, once per run) =====
let forbiddenOffer = null;
let forbiddenOwned = {};
let forbiddenRunClaimed = false;

const FORBIDDEN_CHANCE = 0.01;
const FORBIDDEN_MIN_WAVE = 4;

const FORBIDDEN_CARDS = [
  {
    id: 'fb_overdrive',
    name: '過負荷連射',
    symbol: '>>>',
    desc: '弾幕を極限まで加速。通常強化の限界を超える',
    effectLabel: '発射間隔 3F（最速）',
    cost: 32,
  },
  {
    id: 'fb_annihilation',
    name: '終焉の火力',
    symbol: '!!!',
    desc: '1発に破壊的ダメージを宿す',
    effectLabel: '攻撃力 +4',
    cost: 36,
  },
  {
    id: 'fb_apocalypse',
    name: '天崩の弾雨',
    symbol: '***',
    desc: '全方位5方向弾＋強力追尾を即時獲得',
    effectLabel: '5方向 + 追尾80%',
    cost: 40,
  },
  {
    id: 'fb_reaper',
    name: '死神の裁き',
    symbol: 'XX',
    desc: '体力が半分以上残っていても処刑する',
    effectLabel: 'HP60%以下で ×4',
    cost: 34,
  },
  {
    id: 'fb_void_aegis',
    name: '虚空の盾',
    symbol: '[O]',
    desc: 'シールドを付与し、8秒ごとに自動再生',
    effectLabel: 'シールド常時＋自動再生',
    cost: 38,
  },
  {
    id: 'fb_domination',
    name: '支配の刻印',
    symbol: '%%',
    desc: '敵を弱体化し、スコア獲得を大幅に増幅',
    effectLabel: '敵弱体 + スコア×1.6',
    cost: 30,
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

function rollForbiddenOfferForShop() {
  if (!forbiddenRunClaimed) {
    forbiddenOffer = null;
    pickForbiddenOffer();
  }
}

function renderForbiddenCard() {
  const slot = document.getElementById('forbiddenCardSlot');
  if (!slot) return;
  slot.innerHTML = '';
  slot.classList.add('hidden');
  if (!forbiddenOffer || forbiddenRunClaimed) return;

  const card = forbiddenOffer;
  const cost = getForbiddenCost(card);
  const canBuy = upgradePoints >= cost;

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
