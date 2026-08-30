// ===== CHARACTERS (definitions, passives, select UI) =====
let activeCharId = 'blaster';
let ownedChars = ['blaster'];

const CHARACTERS = [
  {
    id: 'blaster', name: 'ブラスター', symbol: '✦',
    tagline: 'どの系統でも伸ばせる万能型',
    traits: ['4系統すべて4/4まで', 'ウェーブ報酬+1PT', 'スコア+5%'],
    desc: 'バランス型。生存・攻撃・成長・ゲージを均等に伸ばしたい向け。',
    cost: 0, color: '#88ccff', glow: 'rgba(0,160,255,0.55)',
    branchLabels: ['生存', '攻撃', '成長', 'ゲージ'],
  },
  {
    id: 'guardian', name: 'ガーディアン', symbol: '♦',
    tagline: 'シールド再生が速い防御の壁',
    traits: ['開始シールド付き', 'シールド12秒再生', 'アーマー上限3回'],
    desc: '防御特化。被弾を減らしながら長期戦で押し切る向け。',
    cost: 12, color: '#44ffaa', glow: 'rgba(0,200,100,0.55)',
    branchLabels: ['防御', '反撃', '資源', '充能'],
  },
  {
    id: 'striker', name: 'ストライカー', symbol: '▲',
    tagline: '1発の火力で押し切る攻撃型',
    traits: ['基礎攻撃+1', '会心+8%', '貫通+1'],
    desc: '火力特化。高ダメージ・処刑・連鎖で敵を一気に刈る向け。',
    cost: 12, color: '#ff8844', glow: 'rgba(255,100,40,0.55)',
    branchLabels: ['耐久', '火力', '賞金', 'SP'],
  },
  {
    id: 'volt', name: 'ヴォルト', symbol: '⚡',
    tagline: '連射とSP回転の弾幕型',
    traits: ['連射間隔-3F', 'ゲージ充填+30%', '開始5秒ラピッド'],
    desc: '連射・ゲージ特化。弾幕とスペシャルを回して圧倒する向け。',
    cost: 15, color: '#cc66ff', glow: 'rgba(180,60,255,0.55)',
    branchLabels: ['装甲', '出力', '効率', 'エネルギー'],
  },
];

function getActiveCharacter() {
  return CHARACTERS.find(c => c.id === activeCharId) || CHARACTERS[0];
}

function getCharShootRateOffset() {
  if (activeCharId === 'volt') return -3;
  return 0;
}
function getCharShieldRegenInterval() {
  if (activeCharId === 'guardian') return 720;
  return 0;
}
function getCharDamageBonus() {
  if (activeCharId === 'striker') return 1;
  return 0;
}
function getCharCritBonus() {
  if (activeCharId === 'striker') return 0.08;
  return 0;
}
function getCharPierceBonus() {
  if (activeCharId === 'striker') return 1;
  return 0;
}
function getCharGaugeMult() {
  if (activeCharId === 'volt') return 1.3;
  return 1;
}
function getCharMoveSpeedMult() {
  if (activeCharId === 'guardian') return 0.95;
  if (activeCharId === 'striker') return 1.05;
  return 1;
}
function getCharScoreMult() {
  if (activeCharId === 'blaster') return 1.05;
  return 1;
}
function getCharWavePtBonus() {
  if (activeCharId === 'blaster') return 1;
  return 0;
}
function getCharSpecialCdMult() {
  if (activeCharId === 'volt') return 0.85;
  return 1;
}

function applyCharacterStartBonuses() {
  if (activeCharId === 'guardian' && player.powerups.shield <= 0) {
    player.powerups.shield = 1;
  }
  if (activeCharId === 'volt') {
    player.powerups.rapid = Math.max(player.powerups.rapid, 300);
  }
}

function renderCharHeader(ch) {
  const titleEl = document.getElementById('ptCharTitle');
  if (titleEl) titleEl.textContent = ch.name;
  const tagEl = document.getElementById('ptCharTagline');
  if (tagEl) tagEl.textContent = ch.tagline || '';
  const traitsEl = document.getElementById('ptCharTraits');
  if (traitsEl) {
    traitsEl.innerHTML = (ch.traits || []).map(t => `<span class="pt-char-trait">${t}</span>`).join('');
  }
}

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
      `<div class="char-card-tagline">${ch.tagline || ''}</div>` +
      `<ul class="char-card-traits">${(ch.traits || []).map(t => `<li>${t}</li>`).join('')}</ul>` +
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

const Characters = {
  init() {
    document.getElementById('charSelectClose')?.addEventListener('click', closeCharSelect);
    document.getElementById('ptCharBtn')?.addEventListener('click', openCharSelect);
    document.getElementById('charSelectOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'charSelectOverlay') closeCharSelect();
    });
  },
};
