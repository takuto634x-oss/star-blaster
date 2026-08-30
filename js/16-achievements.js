// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS_STORAGE_KEY = 'starblaster_achievements_v1';

const ACHIEVEMENT_DEFS = [
  { id: 'first_wave',  name: '初陣',       desc: '初めてウェーブをクリア',              icon: '★' },
  { id: 'wave_10',     name: 'ウェーブ10', desc: 'ウェーブ10まで到達',                  icon: '10' },
  { id: 'wave_25',     name: 'ウェーブ25', desc: 'ウェーブ25まで到達',                  icon: '25' },
  { id: 'first_boss',  name: 'ボス討伐',   desc: '初めてボスを撃破',                    icon: '☠' },
  { id: 'score_10k',   name: 'スコア1万',  desc: '1ランでスコア10,000を達成',           icon: 'S' },
  { id: 'score_50k',   name: 'スコア5万',  desc: '1ランでスコア50,000を達成',           icon: 'S+' },
  { id: 'hard_wave_5', name: 'HARDの証',   desc: 'HARDでウェーブ5まで到達',             icon: '!' },
  { id: 'extra_unlock',name: 'EXTRA解放',  desc: 'EXTRAモードを解放',                   icon: 'EX' },
  { id: 'perm_first',  name: '永続強化',   desc: '永続ツリーで初めて強化を購入',        icon: '✦' },
  { id: 'char_buy',    name: '新キャラ',   desc: '追加キャラクターを購入',              icon: '◎' },
  { id: 'boss_all',    name: 'ボスハンター', desc: '5種類すべてのボスを撃破',         icon: '👑' },
  { id: 'no_hit_wave', name: '完全回避',   desc: '被弾なしでウェーブをクリア',          icon: '○' },
  { id: 'kill_100',    name: '撃破100',    desc: '累計100体を撃破',                     icon: '×' },
  { id: 'games_10',    name: '10プレイ',   desc: '10回プレイ',                          icon: '▶' },
  // --- 高難度 ---
  { id: 'wave_50',         name: 'ウェーブ50',   desc: 'ウェーブ50まで到達',                      icon: '50', hard: true },
  { id: 'hard_wave_25',    name: 'HARD極限',     desc: 'HARDでウェーブ25到達',                    icon: 'H!', hard: true },
  { id: 'extra_wave_10',   name: 'EXTRA十傑',    desc: 'EXTRAでウェーブ10到達',                   icon: 'X10', hard: true },
  { id: 'extra_wave_25',   name: 'EXTRA覇者',    desc: 'EXTRAでウェーブ25到達',                   icon: 'X25', hard: true },
  { id: 'score_100k',      name: 'スコア10万',   desc: '1ランでスコア100,000を達成',              icon: 'S++', hard: true },
  { id: 'score_200k',      name: 'スコア20万',   desc: '1ランでスコア200,000を達成',              icon: 'MAX', hard: true },
  { id: 'no_hit_streak_5', name: '無傷五連',     desc: '被弾なしで5ウェーブ連続クリア',            icon: '○5', hard: true },
  { id: 'no_hit_streak_10',name: '無傷十連',     desc: '被弾なしで10ウェーブ連続クリア',           icon: '○10', hard: true },
  { id: 'flawless_boss',   name: '完璧討伐',     desc: 'ボスを1発も受けずに撃破',                 icon: '☆', hard: true },
  { id: 'combo_15',        name: 'コンボ15',     desc: '1ランでコンボ15を達成',                   icon: 'C15', hard: true },
  { id: 'speed_wave_10',   name: '光速十',       desc: '4x速度でウェーブ10到達',                  icon: '4x', hard: true },
  { id: 'one_life_wave_20',name: '命ひとつ',     desc: 'ライフ1のままウェーブ20到達',             icon: '♥1', hard: true },
  { id: 'all_chars',       name: '全キャラ制覇', desc: '全キャラクターを所持',                    icon: '◎◎', hard: true },
  { id: 'kill_1000',       name: '撃破1000',     desc: '累計1000体を撃破',                        icon: '×K', hard: true },
  { id: 'perm_buy_20',     name: '永続マスター', desc: '永続強化を累計20回購入',                  icon: '✦✦', hard: true },
];

const ACH_BY_ID = Object.fromEntries(ACHIEVEMENT_DEFS.map(a => [a.id, a]));

let achData = { unlocked: {}, stats: { totalKills: 0, bossTypes: {}, gamesPlayed: 0, permBuys: 0 } };
let achRun = { waveNoHit: true, noHitStreak: 0, runCombo: 0, runComboTimer: 0, startLives: 3, bossNoHit: true };

const Achievements = (() => {
  let toastTimer = null;

  function emptyData() {
    return { unlocked: {}, stats: { totalKills: 0, bossTypes: {}, gamesPlayed: 0, permBuys: 0 } };
  }

  function load() {
    if (!activeProfileId) {
      achData = emptyData();
      return;
    }
    try {
      const raw = profileGet(ACHIEVEMENTS_STORAGE_KEY);
      if (!raw) {
        achData = emptyData();
        return;
      }
      const parsed = JSON.parse(raw);
      achData = {
        unlocked: parsed.unlocked || {},
        stats: {
          totalKills: parsed.stats?.totalKills || 0,
          bossTypes: parsed.stats?.bossTypes || {},
          gamesPlayed: parsed.stats?.gamesPlayed || 0,
          permBuys: parsed.stats?.permBuys || 0,
        },
      };
    } catch (e) {
      achData = emptyData();
    }
    if (typeof isExtraUnlocked === 'function' && isExtraUnlocked() && !achData.unlocked.extra_unlock) {
      achData.unlocked.extra_unlock = Date.now();
      save();
    }
    checkAllChars();
  }

  function save() {
    if (!activeProfileId || debugMode) return;
    profileSet(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achData));
  }

  function isUnlocked(id) {
    return !!achData.unlocked[id];
  }

  function unlockedCount() {
    return ACHIEVEMENT_DEFS.filter(a => isUnlocked(a.id)).length;
  }

  function unlock(id) {
    if (debugMode || !activeProfileId || isUnlocked(id)) return false;
    const def = ACH_BY_ID[id];
    if (!def) return false;
    achData.unlocked[id] = Date.now();
    save();
    showToast(def);
    Sfx.play('upgrade', true);
    return true;
  }

  function showToast(def) {
    const toast = document.getElementById('achievementToast');
    if (!toast) return;
    toast.querySelector('.achievement-toast-title').textContent = '実績解除！';
    toast.querySelector('.achievement-toast-name').textContent = def.name;
    toast.querySelector('.achievement-toast-desc').textContent = def.desc;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
      toastTimer = null;
    }, 2600);
  }

  function resetRun() {
    achRun = {
      waveNoHit: true,
      noHitStreak: 0,
      runCombo: 0,
      runComboTimer: 0,
      startLives: lives,
      bossNoHit: true,
    };
  }

  function onBossSpawn() {
    if (debugMode) return;
    achRun.bossNoHit = true;
  }

  function onDamageTaken() {
    if (debugMode || state !== 'playing') return;
    achRun.waveNoHit = false;
    if (bossActive) achRun.bossNoHit = false;
  }

  function tickRunCombo() {
    if (debugMode || state !== 'playing') return;
    if (achRun.runComboTimer > 0) {
      achRun.runComboTimer--;
    } else if (achRun.runCombo > 0) {
      achRun.runCombo = 0;
    }
  }

  function checkAllChars() {
    if (typeof CHARACTERS !== 'undefined' && ownedChars.length >= CHARACTERS.length) {
      unlock('all_chars');
    }
  }

  function onEnemyKill(isBoss, bossType) {
    if (debugMode || !activeProfileId) return;
    achData.stats.totalKills = (achData.stats.totalKills || 0) + 1;
    if (isBoss) {
      if (bossType) achData.stats.bossTypes[bossType] = true;
      unlock('first_boss');
      const types = achData.stats.bossTypes || {};
      if (BOSS_TYPES.every(t => types[t])) unlock('boss_all');
    }
    if (achData.stats.totalKills >= 100) unlock('kill_100');
    if (achData.stats.totalKills >= 1000) unlock('kill_1000');
    achRun.runCombo = (achRun.runCombo || 0) + 1;
    achRun.runComboTimer = 150;
    if (achRun.runCombo >= 15) unlock('combo_15');
    save();
  }

  function onWaveClear(wave, wasBoss) {
    if (debugMode || !activeProfileId) return;
    unlock('first_wave');
    if (wave >= 10) unlock('wave_10');
    if (wave >= 25) unlock('wave_25');
    if (wave >= 50) unlock('wave_50');
    if (playDifficultyId === 'hard' && wave >= 5) unlock('hard_wave_5');
    if (playDifficultyId === 'hard' && wave >= 25) unlock('hard_wave_25');
    if (playDifficultyId === 'hard' && wave >= EXTRA_UNLOCK_WAVE) unlock('extra_unlock');
    if (playDifficultyId === 'extra' && wave >= 10) unlock('extra_wave_10');
    if (playDifficultyId === 'extra' && wave >= 25) unlock('extra_wave_25');
    if (gameSpeed >= 4 && wave >= 10) unlock('speed_wave_10');
    if (lives === 1 && wave >= 20) unlock('one_life_wave_20');
    if (achRun.waveNoHit) {
      unlock('no_hit_wave');
      achRun.noHitStreak++;
      if (achRun.noHitStreak >= 5) unlock('no_hit_streak_5');
      if (achRun.noHitStreak >= 10) unlock('no_hit_streak_10');
    } else {
      achRun.noHitStreak = 0;
    }
    if (wasBoss && achRun.bossNoHit) unlock('flawless_boss');
    achRun.waveNoHit = true;
    achRun.bossNoHit = true;
    save();
  }

  function onGameOver() {
    if (debugMode || !activeProfileId) return;
    achData.stats.gamesPlayed = (achData.stats.gamesPlayed || 0) + 1;
    if (score >= 10000) unlock('score_10k');
    if (score >= 50000) unlock('score_50k');
    if (score >= 100000) unlock('score_100k');
    if (score >= 200000) unlock('score_200k');
    if (achData.stats.gamesPlayed >= 10) unlock('games_10');
    save();
  }

  function onPermBuy() {
    unlock('perm_first');
    achData.stats.permBuys = (achData.stats.permBuys || 0) + 1;
    if (achData.stats.permBuys >= 20) unlock('perm_buy_20');
    save();
  }

  function onCharBuy() {
    unlock('char_buy');
    checkAllChars();
  }

  function onExtraUnlocked() {
    unlock('extra_unlock');
  }

  function renderRow(def) {
    const ok = isUnlocked(def.id);
    const date = ok ? new Date(achData.unlocked[def.id]).toLocaleDateString('ja-JP') : '';
    const hardCls = def.hard ? ' hard' : '';
    return `<div class="achievement-row${hardCls}${ok ? ' unlocked' : ''}">
      <div class="achievement-icon">${def.icon}</div>
      <div class="achievement-body">
        <div class="achievement-name">${def.name}${def.hard ? ' <span class="achievement-hard-tag">高難度</span>' : ''}</div>
        <div class="achievement-desc">${def.desc}</div>
        ${ok ? `<div class="achievement-date">${date}</div>` : ''}
      </div>
      <div class="achievement-status">${ok ? '✓' : '—'}</div>
    </div>`;
  }

  function renderList() {
    const wrap = document.getElementById('achievementsList');
    const prog = document.getElementById('achievementsProgress');
    if (!wrap) return;
    const total = ACHIEVEMENT_DEFS.length;
    const done = unlockedCount();
    if (prog) prog.textContent = `${done} / ${total} 解除`;
    const normal = ACHIEVEMENT_DEFS.filter(a => !a.hard);
    const hard = ACHIEVEMENT_DEFS.filter(a => a.hard);
    wrap.innerHTML =
      normal.map(renderRow).join('') +
      (hard.length ? `<div class="achievements-section">🔥 高難度</div>${hard.map(renderRow).join('')}` : '');
    checkAllChars();
  }

  function openOverlay() {
    if (state !== 'title') return;
    if (!activeProfileId) {
      openProfileOverlay(true);
      return;
    }
    load();
    renderList();
    ScreenUI.dismissHint(false);
    ScreenUI.open('achievements');
  }

  function closeOverlay() {
    ScreenUI.close('achievements');
  }

  function init() {
    load();
    document.getElementById('achievementsBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      openOverlay();
    });
    document.getElementById('achievementsCloseBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      closeOverlay();
    });
    document.getElementById('achievementsOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'achievementsOverlay') closeOverlay();
    });
  }

  return {
    init, load, save, resetRun, isUnlocked, unlockedCount,
    onDamageTaken, onEnemyKill, onWaveClear, onGameOver, onBossSpawn, tickRunCombo,
    onPermBuy, onCharBuy, onExtraUnlocked,
    openOverlay, closeOverlay, renderList,
  };
})();
