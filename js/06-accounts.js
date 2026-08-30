// ===== ACCOUNTS =====
// FIREBASE_CONFIG を設定すると Firestore 上のゲームアカウントを全員で共有（ログイン不要）
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCAaheTRlHMeBdAkDuhiPV_g80ml4emjs",
  authDomain: "star-blaster-6fabc.firebaseapp.com",
  projectId: "star-blaster-6fabc",
  storageBucket: "star-blaster-6fabc.firebasestorage.app",
  messagingSenderId: "601343535787",
  appId: "1:601343535787:web:b96ec171d49cace8db65ee",
};
const SHARED_ACCOUNTS_URL = 'accounts.json';
const PROFILES_REGISTRY_KEY = 'starblaster_profiles_v1';
const ACTIVE_PROFILE_KEY = 'starblaster_active_profile_v1';
const HIGHSCORE_STORAGE_KEY = 'starblaster_highscore_v1';
const HIGHSCORES_STORAGE_KEY = 'starblaster_highscores_v1';
const WEEKLY_HIGHSCORES_STORAGE_KEY = 'starblaster_weekly_highscores_v1';
const DIFFICULTY_HS_IDS = ['easy', 'normal', 'hard', 'extra'];
let highscoresByDiff = { easy: 0, normal: 0, hard: 0, extra: 0 };
let weeklyRecord = { weekKey: '', scores: { easy: 0, normal: 0, hard: 0, extra: 0 } };

function emptyHighscores() {
  return { easy: 0, normal: 0, hard: 0, extra: 0 };
}

function normalizeHighscores(raw) {
  const out = emptyHighscores();
  if (!raw || typeof raw !== 'object') return out;
  DIFFICULTY_HS_IDS.forEach(id => {
    const v = parseInt(raw[id], 10);
    if (Number.isFinite(v) && v > 0) out[id] = v;
  });
  return out;
}

function parseHighscoresJson(str) {
  try {
    if (!str) return emptyHighscores();
    return normalizeHighscores(JSON.parse(str));
  } catch (e) {
    return emptyHighscores();
  }
}

function highscoresMax(hss) {
  return Math.max(hss.easy || 0, hss.normal || 0, hss.hard || 0, hss.extra || 0);
}

function highscoresFromCloudData(data) {
  if (data?.highscores && typeof data.highscores === 'object') {
    return normalizeHighscores(data.highscores);
  }
  return mergeLegacyHighscore(emptyHighscores(), data?.highscore);
}

function mergeLegacyHighscore(hss, legacyVal) {
  const out = normalizeHighscores(hss);
  const legacy = parseInt(legacyVal, 10) || 0;
  if (legacy > 0 && !out.normal) out.normal = legacy;
  return out;
}

function readStoredHighscores(profileId) {
  const raw = localStorage.getItem(profileKeyFor(profileId, HIGHSCORES_STORAGE_KEY));
  if (raw) return parseHighscoresJson(raw);
  const legacy = localStorage.getItem(profileKeyFor(profileId, HIGHSCORE_STORAGE_KEY));
  return mergeLegacyHighscore(emptyHighscores(), legacy);
}

/** 週の開始日（月曜）をキーにする */
function getWeekKey(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, '0');
  const dd = String(copy.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatWeekRangeLabel(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  const mon = new Date(copy);
  const sun = new Date(copy);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}`;
  return `${fmt(mon)}〜${fmt(sun)}`;
}

function emptyWeeklyRecord() {
  return { weekKey: getWeekKey(), scores: emptyHighscores() };
}

function parseWeeklyRecord(raw) {
  if (!raw) return emptyWeeklyRecord();
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return emptyWeeklyRecord();
    return {
      weekKey: parsed.weekKey || '',
      scores: normalizeHighscores(parsed.scores),
    };
  } catch (e) {
    return emptyWeeklyRecord();
  }
}

function ensureCurrentWeeklyRecord(record) {
  const wk = getWeekKey();
  if (record.weekKey !== wk) return { weekKey: wk, scores: emptyHighscores() };
  return { weekKey: wk, scores: normalizeHighscores(record.scores) };
}

function readStoredWeeklyRecord(profileId) {
  const raw = localStorage.getItem(profileKeyFor(profileId, WEEKLY_HIGHSCORES_STORAGE_KEY));
  return ensureCurrentWeeklyRecord(parseWeeklyRecord(raw));
}

function readProfileWeeklyHighscores(profileId) {
  if (CloudSync.isEnabled() && cloudAccountSummary[profileId]) {
    return ensureCurrentWeeklyRecord(parseWeeklyRecord(cloudAccountSummary[profileId].weeklyRaw)).scores;
  }
  return readStoredWeeklyRecord(profileId).scores;
}

const MAX_PROFILES = 60;
const LEGACY_PERM_KEYS = ['starblaster_perm_v5', 'starblaster_perm_v4', 'starblaster_perm_v3'];
const LEGACY_TUTORIAL_KEYS = ['starblaster_tutorial_v1', 'starblaster_hint_shop_v1', 'starblaster_hint_perm_v1'];

let activeProfileId = null;
let profilesRegistry = { profiles: [] };
let profileGateMode = false;
const cloudAccountSummary = {};

// ===== CLOUD SYNC (Firestore) =====
const CloudSync = (() => {
  let enabled = false;
  let db = null;
  let activeDoc = null;
  let saveTimer = null;
  let initialized = false;

  function isEnabled() { return enabled; }
  function hasLoadedAccount() { return !!activeDoc; }

  async function init() {
    if (initialized) return enabled;
    initialized = true;
    if (!FIREBASE_CONFIG || typeof firebase === 'undefined') return false;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      enabled = true;
      return true;
    } catch (e) {
      console.warn('CloudSync init failed', e);
      return false;
    }
  }

  async function seedIfEmpty() {
    if (!enabled) return;
    const snap = await db.collection('gameAccounts').limit(1).get();
    if (!snap.empty) return;
    const names = new Set();
    try {
      const res = await fetch(SHARED_ACCOUNTS_URL + '?v=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.accounts)) {
          data.accounts.forEach(n => { if (n && String(n).trim()) names.add(String(n).trim().slice(0, 12)); });
        }
      }
    } catch (e) {}
    if (names.size === 0) {
      ['プレイヤー1', 'プレイヤー2', 'プレイヤー3'].forEach(n => names.add(n));
    }
    const batch = db.batch();
    names.forEach(name => {
      const ref = db.collection('gameAccounts').doc();
      batch.set(ref, { name, createdAt: Date.now(), highscore: 0, highscores: emptyHighscores(), perm: null, flags: {} });
    });
    await batch.commit();
  }

  async function refreshAccountList() {
    if (!enabled) return;
    const snap = await db.collection('gameAccounts').orderBy('name').get();
    profilesRegistry.profiles = [];
    Object.keys(cloudAccountSummary).forEach(k => delete cloudAccountSummary[k]);
    snap.forEach(doc => {
      const data = doc.data();
      profilesRegistry.profiles.push({
        id: doc.id,
        name: data.name || '名称未設定',
        createdAt: data.createdAt || 0,
      });
      cloudAccountSummary[doc.id] = {
        hss: highscoresFromCloudData(data),
        pts: (data.perm && data.perm.pts) || 0,
        weeklyRaw: (data.flags && data.flags[WEEKLY_HIGHSCORES_STORAGE_KEY]) || null,
      };
      cloudAccountSummary[doc.id].hs = highscoresMax(cloudAccountSummary[doc.id].hss);
    });
  }

  async function loadAccount(accountId) {
    if (!enabled) return;
    const doc = await db.collection('gameAccounts').doc(accountId).get();
    activeDoc = doc.exists
      ? { id: doc.id, ...doc.data() }
      : { id: accountId, name: '名称未設定', highscore: 0, highscores: emptyHighscores(), perm: null, flags: {} };
    if (!activeDoc.flags) activeDoc.flags = {};
    activeDoc.highscores = highscoresFromCloudData(activeDoc);
    activeDoc.highscore = highscoresMax(activeDoc.highscores);
  }

  function setPermPayload(payload) {
    if (!activeDoc) return;
    activeDoc.perm = payload;
    if (cloudAccountSummary[activeDoc.id]) cloudAccountSummary[activeDoc.id].pts = payload.pts || 0;
  }

  function setHighscores(hss) {
    if (!activeDoc) return;
    activeDoc.highscores = normalizeHighscores(hss);
    activeDoc.highscore = highscoresMax(activeDoc.highscores);
    if (cloudAccountSummary[activeDoc.id]) {
      cloudAccountSummary[activeDoc.id].hss = { ...activeDoc.highscores };
      cloudAccountSummary[activeDoc.id].hs = activeDoc.highscore;
    }
  }

  function setHighscoreValue(v) {
    const hss = activeDoc?.highscores ? normalizeHighscores(activeDoc.highscores) : emptyHighscores();
    hss.normal = v;
    setHighscores(hss);
  }

  function getFlag(key) {
    return activeDoc?.flags?.[key] ?? null;
  }

  function setFlag(key, value) {
    if (!activeDoc) return;
    if (!activeDoc.flags) activeDoc.flags = {};
    activeDoc.flags[key] = value;
    scheduleSave();
  }

  function scheduleSave() {
    if (!enabled || !activeDoc) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { flushActiveAccount().catch(() => {}); }, 400);
  }

  async function flushActiveAccount() {
    if (!enabled || !activeDoc) return;
    const { id, name, createdAt, highscore, highscores, perm, flags } = activeDoc;
    const hss = normalizeHighscores(highscores || { normal: highscore || 0 });
    await db.collection('gameAccounts').doc(id).set(
      { name, createdAt: createdAt || Date.now(), highscore: highscoresMax(hss), highscores: hss, perm: perm || null, flags: flags || {} },
      { merge: true },
    );
  }

  function applyPermToGame() {
    if (!activeDoc || !activeDoc.perm) {
      permPoints = 0;
      activeCharId = 'blaster';
      ownedChars = ['blaster'];
      Object.keys(charPermData).forEach(k => delete charPermData[k]);
      charPermData.blaster = {};
      Object.keys(charPermActiveData).forEach(k => delete charPermActiveData[k]);
      charPermActiveData.blaster = {};
      Object.keys(permLevels).forEach(k => delete permLevels[k]);
      Object.keys(permActiveLevels).forEach(k => delete permActiveLevels[k]);
      syncPermLevelsFromChar(activeCharId);
      syncPermActiveFromChar(activeCharId);
      return;
    }
    const d = activeDoc.perm;
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
    Object.keys(charPermActiveData).forEach(k => delete charPermActiveData[k]);
    charPermActiveData.blaster = {};
    if (d.charActive) Object.assign(charPermActiveData, d.charActive);
    syncPermLevelsFromChar(activeCharId);
    syncPermActiveFromChar(activeCharId);
  }

  async function createAccount(name) {
    if (!enabled) return null;
    const ref = db.collection('gameAccounts').doc();
    await ref.set({ name, createdAt: Date.now(), highscore: 0, highscores: emptyHighscores(), perm: null, flags: {} });
    await refreshAccountList();
    return ref.id;
  }

  function getActiveHighscores() {
    return activeDoc ? highscoresFromCloudData(activeDoc) : emptyHighscores();
  }

  function getActiveHighscore() {
    return highscoresMax(getActiveHighscores());
  }

  async function deleteAccount(accountId) {
    if (!enabled) return;
    await db.collection('gameAccounts').doc(accountId).delete();
    if (activeDoc && activeDoc.id === accountId) activeDoc = null;
    await refreshAccountList();
  }

  async function submitFeedback({ category, text, profileName }) {
    if (!enabled) return false;
    await db.collection('feedback').add({
      category: category || 'other',
      text: String(text || '').slice(0, 500),
      profileName: String(profileName || '').slice(0, 24),
      createdAt: Date.now(),
    });
    return true;
  }

  async function listFeedback(limit = 80) {
    if (!enabled) return [];
    const snap = await db.collection('feedback').orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function deleteFeedback(docId) {
    if (!enabled || !docId) return false;
    await db.collection('feedback').doc(String(docId)).delete();
    return true;
  }

  return {
    init, isEnabled, hasLoadedAccount, seedIfEmpty, refreshAccountList, loadAccount,
    setPermPayload, setHighscores, setHighscoreValue, getFlag, setFlag, scheduleSave, flushActiveAccount,
    applyPermToGame, createAccount, deleteAccount, getActiveHighscores, getActiveHighscore,
    submitFeedback, listFeedback, deleteFeedback,
  };
})();

// ===== PROFILE STORAGE =====
function profileKeyFor(profileId, baseKey) {
  return `${baseKey}__p_${profileId}`;
}

function profileStorageKey(baseKey) {
  return activeProfileId ? profileKeyFor(activeProfileId, baseKey) : baseKey;
}

function profileGet(baseKey) {
  if (CloudSync.isEnabled()) return CloudSync.getFlag(baseKey);
  if (!activeProfileId) return null;
  return localStorage.getItem(profileStorageKey(baseKey));
}

function profileSet(baseKey, value) {
  if (CloudSync.isEnabled()) {
    CloudSync.setFlag(baseKey, value);
    return;
  }
  if (!activeProfileId) return;
  localStorage.setItem(profileStorageKey(baseKey), value);
}

function generateProfileId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getProfile(profileId) {
  return profilesRegistry.profiles.find(p => p.id === profileId) || null;
}

function getActiveProfile() {
  return activeProfileId ? getProfile(activeProfileId) : null;
}

function saveProfilesRegistry() {
  localStorage.setItem(PROFILES_REGISTRY_KEY, JSON.stringify(profilesRegistry));
}

function loadProfilesRegistry() {
  try {
    const raw = localStorage.getItem(PROFILES_REGISTRY_KEY);
    profilesRegistry = raw ? JSON.parse(raw) : { profiles: [] };
    if (!Array.isArray(profilesRegistry.profiles)) profilesRegistry = { profiles: [] };
  } catch (e) {
    profilesRegistry = { profiles: [] };
  }
}

function readProfileHighscores(profileId) {
  if (CloudSync.isEnabled() && cloudAccountSummary[profileId]) {
    return { ...cloudAccountSummary[profileId].hss };
  }
  return readStoredHighscores(profileId);
}

function readProfileSummary(profileId) {
  if (CloudSync.isEnabled() && cloudAccountSummary[profileId]) {
    const hss = cloudAccountSummary[profileId].hss || emptyHighscores();
    return { pts: cloudAccountSummary[profileId].pts || 0, hs: highscoresMax(hss), hss };
  }
  let pts = 0;
  try {
    const permRaw = localStorage.getItem(profileKeyFor(profileId, 'starblaster_perm_v5'));
    if (permRaw) pts = JSON.parse(permRaw).pts || 0;
  } catch (e) {}
  const hss = readProfileHighscores(profileId);
  return { pts, hs: highscoresMax(hss), hss };
}

// ===== HIGHSCORES & RANKING =====
let leaderboardDiffId = 'normal';
let leaderboardMode = 'all'; // 'all' | 'weekly'

function loadWeeklyHighscores() {
  if (CloudSync.isEnabled() && activeProfileId) {
    weeklyRecord = ensureCurrentWeeklyRecord(parseWeeklyRecord(CloudSync.getFlag(WEEKLY_HIGHSCORES_STORAGE_KEY)));
  } else if (activeProfileId) {
    weeklyRecord = readStoredWeeklyRecord(activeProfileId);
  } else {
    weeklyRecord = emptyWeeklyRecord();
  }
}

function saveWeeklyHighscores() {
  if (!activeProfileId || debugMode) return;
  weeklyRecord = ensureCurrentWeeklyRecord(weeklyRecord);
  const payload = JSON.stringify(weeklyRecord);
  profileSet(WEEKLY_HIGHSCORES_STORAGE_KEY, payload);
}

function recordWeeklyScore(runScore, diffId) {
  if (debugMode || !activeProfileId) return;
  weeklyRecord = ensureCurrentWeeklyRecord(weeklyRecord);
  const prev = weeklyRecord.scores[diffId] || 0;
  if (runScore > prev) {
    weeklyRecord.scores[diffId] = runScore;
    saveWeeklyHighscores();
    if (CloudSync.isEnabled() && cloudAccountSummary[activeProfileId]) {
      cloudAccountSummary[activeProfileId].weeklyRaw = JSON.stringify(weeklyRecord);
    }
  }
}

function buildAccountLeaderboard(diffId = leaderboardDiffId, mode = leaderboardMode) {
  if (!CloudSync.isEnabled()) loadProfilesRegistry();
  return profilesRegistry.profiles
    .map(p => {
      const { pts, hss } = readProfileSummary(p.id);
      const weeklyHss = readProfileWeeklyHighscores(p.id);
      const hs = mode === 'weekly' ? (weeklyHss[diffId] || 0) : (hss[diffId] || 0);
      return { id: p.id, name: p.name, pts, hs };
    })
    .sort((a, b) => b.hs - a.hs || a.name.localeCompare(b.name, 'ja'));
}

function updateLeaderboardModeTabs() {
  document.querySelectorAll('.leaderboard-mode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lbMode === leaderboardMode);
  });
  const sub = document.getElementById('leaderboardSub');
  if (sub) {
    sub.textContent = leaderboardMode === 'weekly'
      ? `今週（${formatWeekRangeLabel()}）のベスト · 難易度ごと · 月曜リセット`
      : '共有ゲームアカウント別ハイスコア（難易度ごと）';
  }
}

function updateLeaderboardDiffTabs() {
  document.querySelectorAll('.leaderboard-diff-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lbDiff === leaderboardDiffId);
  });
}

function setLeaderboardDifficulty(diffId) {
  if (!DIFFICULTIES[diffId]) return;
  leaderboardDiffId = diffId;
  updateLeaderboardDiffTabs();
  renderLeaderboard();
  Sfx.play('ui', true);
}

function setLeaderboardMode(mode) {
  if (mode !== 'all' && mode !== 'weekly') return;
  leaderboardMode = mode;
  updateLeaderboardModeTabs();
  renderLeaderboard();
  Sfx.play('ui', true);
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  const diffLabel = DIFFICULTIES[leaderboardDiffId]?.label || leaderboardDiffId.toUpperCase();
  const modeLabel = leaderboardMode === 'weekly' ? '週間' : '通算';
  const rows = buildAccountLeaderboard(leaderboardDiffId, leaderboardMode);
  if (rows.length === 0) {
    list.innerHTML = '<div class="leaderboard-empty">アカウントがありません<br>先にアカウントを作成してください</div>';
    return;
  }
  list.innerHTML = rows.map((row, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    const activeClass = row.id === activeProfileId ? ' active' : '';
    const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
    const scoreText = row.hs > 0 ? row.hs.toLocaleString() : '—';
    return `
      <div class="leaderboard-row${rankClass}${activeClass}">
        <div class="leaderboard-rank">${rankLabel}</div>
        <div>
          <div class="leaderboard-name">${escapeHtml(row.name)}</div>
          <div class="leaderboard-meta">${modeLabel} · ${diffLabel} · PT ${row.pts}${row.id === activeProfileId ? ' · 使用中' : ''}</div>
        </div>
        <div class="leaderboard-score">${scoreText}</div>
      </div>`;
  }).join('');
}

async function openLeaderboard() {
  if (state !== 'title') return;
  if (CloudSync.isEnabled()) await CloudSync.refreshAccountList();
  loadWeeklyHighscores();
  updateLeaderboardModeTabs();
  updateLeaderboardDiffTabs();
  renderLeaderboard();
  ScreenUI.open('leaderboard');
}

function closeLeaderboard() {
  ScreenUI.close('leaderboard');
}

// ===== LEGACY MIGRATION =====
function migrateLegacySaveIfNeeded() {
  loadProfilesRegistry();
  if (profilesRegistry.profiles.length > 0) return;

  let legacyPerm = null;
  for (const k of LEGACY_PERM_KEYS) {
    legacyPerm = localStorage.getItem(k);
    if (legacyPerm) break;
  }

  const id = generateProfileId();
  profilesRegistry.profiles.push({
    id, name: 'プレイヤー1', createdAt: Date.now(),
  });
  saveProfilesRegistry();

  if (legacyPerm) {
    localStorage.setItem(profileKeyFor(id, 'starblaster_perm_v5'), legacyPerm);
  }
  LEGACY_TUTORIAL_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) localStorage.setItem(profileKeyFor(id, k), v);
  });
}

function deleteProfileData(profileId) {
  const prefix = `__p_${profileId}`;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.endsWith(prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

function syncHighscoreVarFromDifficulty() {
  highscore = highscoresByDiff[difficultyId] || 0;
}

function loadAllHighscores() {
  if (CloudSync.isEnabled() && CloudSync.hasLoadedAccount()) {
    highscoresByDiff = CloudSync.getActiveHighscores();
  } else if (activeProfileId) {
    const raw = profileGet(HIGHSCORES_STORAGE_KEY);
    highscoresByDiff = raw
      ? parseHighscoresJson(raw)
      : mergeLegacyHighscore(emptyHighscores(), profileGet(HIGHSCORE_STORAGE_KEY));
  } else {
    highscoresByDiff = emptyHighscores();
  }
  syncHighscoreVarFromDifficulty();
}

function loadHighscore() {
  loadAllHighscores();
  loadWeeklyHighscores();
}

function saveHighscore() {
  if (CloudSync.isEnabled() && activeProfileId) {
    CloudSync.setHighscores(highscoresByDiff);
    CloudSync.scheduleSave();
    return;
  }
  if (!activeProfileId) return;
  profileSet(HIGHSCORES_STORAGE_KEY, JSON.stringify(highscoresByDiff));
  profileSet(HIGHSCORE_STORAGE_KEY, String(highscoresByDiff.normal || 0));
}

// ===== DIFFICULTY =====
const DIFFICULTY_KEY = 'starblaster_difficulty_v1';
const EXTRA_UNLOCK_KEY = 'starblaster_extra_unlock_v1';
const HARD_MAX_WAVE_KEY = 'starblaster_hard_max_wave_v1';
const EXTRA_UNLOCK_WAVE = 25;
const DIFFICULTIES = {
  easy:   { label: 'EASY',   desc: 'ライフ+1 · 敵が弱め · 獲得PTやや少なめ', enemyHpMult: 0.8,  enemyShootMult: 0.7,  enemySpeedMult: 0.9,  scoreMult: 0.85, ptMult: 0.85, lifeBonus: 1 },
  normal: { label: 'NORMAL', desc: '標準バランス', enemyHpMult: 1,    enemyShootMult: 1,    enemySpeedMult: 1,    scoreMult: 1,    ptMult: 1,    lifeBonus: 0 },
  hard:   { label: 'HARD',   desc: 'ライフ-1 · 敵が強め · 獲得PTボーナス', enemyHpMult: 1.35, enemyShootMult: 1.35, enemySpeedMult: 1.08, scoreMult: 1.2,  ptMult: 1.3,  lifeBonus: -1 },
  extra:  {
    label: 'EXTRA', desc: 'ライフ1固定 · 敵HP250% · 弾多め · ショップ高騰 · 当たり判定大 · スコア/PT2倍',
    enemyHpMult: 2.5, enemyShootMult: 1.55, enemySpeedMult: 1, scoreMult: 2, ptMult: 2,
    fixedLives: 1, maxLives: 1, shopCostMult: 1.5, playerHitMult: 1.45,
  },
};
let difficultyId = 'normal';
let difficultyReturnTo = 'title';
let playDifficultyId = 'normal';

/** 難易度選択 UI 用（メニューで選んでいる値） */
function getDifficulty() { return DIFFICULTIES[difficultyId] || DIFFICULTIES.normal; }
/** プレイ中の実効難易度（startGame で difficultyId からコピー） */
function getPlayDifficulty() { return DIFFICULTIES[playDifficultyId] || DIFFICULTIES.normal; }

function isExtraUnlocked() {
  return profileGet(EXTRA_UNLOCK_KEY) === '1';
}

function getMaxLives() {
  const d = getPlayDifficulty();
  if (d.maxLives != null) return d.maxLives;
  return 4;
}

function applyPlayerHitRadius() {
  Combat.CFG.playerR = 10 * (getPlayDifficulty().playerHitMult || 1);
}

function recordHardWaveProgress() {
  if (playDifficultyId !== 'hard' || debugMode || !activeProfileId) return;
  const prev = parseInt(profileGet(HARD_MAX_WAVE_KEY) || '0', 10) || 0;
  if (level > prev) profileSet(HARD_MAX_WAVE_KEY, String(level));
  if (level >= EXTRA_UNLOCK_WAVE) {
    profileSet(EXTRA_UNLOCK_KEY, '1');
    Achievements.onExtraUnlocked();
  }
}

function loadDifficulty() {
  if (!activeProfileId) {
    difficultyId = 'normal';
    updateDifficultyUI();
    return;
  }
  const saved = profileGet(DIFFICULTY_KEY);
  difficultyId = (saved && DIFFICULTIES[saved] && (saved !== 'extra' || isExtraUnlocked())) ? saved : 'normal';
  updateDifficultyUI();
}

function setDifficulty(id) {
  if (!DIFFICULTIES[id] || !ScreenUI.isOpen('difficulty')) return;
  const descEl = document.getElementById('difficultyDesc');
  if (id === 'extra' && !isExtraUnlocked()) {
    if (descEl) {
      const best = parseInt(profileGet(HARD_MAX_WAVE_KEY) || '0', 10) || 0;
      descEl.textContent = `🔒 解放条件: HARDでウェーブ${EXTRA_UNLOCK_WAVE}到達（現在のベスト: ${best}）`;
    }
    Sfx.play('ui', true);
    return;
  }
  difficultyId = id;
  updateDifficultyUI();
  Sfx.play('ui', true);
}

function updateDifficultyUI() {
  document.querySelectorAll('.diff-option').forEach(btn => {
    const id = btn.dataset.diff;
    const locked = id === 'extra' && !isExtraUnlocked();
    btn.classList.toggle('active', id === difficultyId && !locked);
    btn.classList.toggle('locked', locked);
  });
  const extraDesc = document.querySelector('.diff-option[data-diff="extra"] .diff-option-desc');
  if (extraDesc) {
    extraDesc.textContent = isExtraUnlocked()
      ? 'ライフ1固定 · 敵HP250% · 弾多め · ショップ高騰 · 当たり判定大'
      : `🔒 HARD W${EXTRA_UNLOCK_WAVE}で解放 · ライフ1 · 敵HP250% · 高難度`;
  }
  const descEl = document.getElementById('difficultyDesc');
  if (descEl) {
    if (difficultyId === 'extra' && !isExtraUnlocked()) {
      const best = parseInt(profileGet(HARD_MAX_WAVE_KEY) || '0', 10) || 0;
      descEl.textContent = `🔒 解放条件: HARDでウェーブ${EXTRA_UNLOCK_WAVE}到達（現在のベスト: ${best}）`;
      return;
    }
    const hs = highscoresByDiff[difficultyId] || 0;
    const hsText = hs > 0 ? ` · 自己ベスト ${hs.toLocaleString()}` : '';
    const wk = ensureCurrentWeeklyRecord(weeklyRecord);
    const wHs = wk.scores[difficultyId] || 0;
    const wText = wHs > 0 ? ` · 週間 ${wHs.toLocaleString()}` : '';
    descEl.textContent = getDifficulty().desc + hsText + wText;
  }
}

function openDifficultySelect(returnTo = 'title') {
  if (!activeProfileId) {
    openProfileOverlay(true);
    return;
  }
  difficultyReturnTo = returnTo;
  loadDifficulty();
  loadWeeklyHighscores();
  loadAllHighscores();
  updateDifficultyUI();
  ScreenUI.dismissHint(false);
  if (returnTo === 'permTree') {
    ScreenUI.onLeavePermTree(false);
    closeCharSelect();
    ScreenUI.close('permTree');
  } else {
    ScreenUI.close('title');
  }
  ScreenUI.open('difficulty');
  state = 'title';
}

function closeDifficultySelect() {
  ScreenUI.close('difficulty');
  if (difficultyReturnTo === 'permTree') {
    showPermTree(0, true);
  } else {
    ScreenUI.open('title');
    state = 'title';
  }
}

function confirmDifficultyStart() {
  if (difficultyId === 'extra' && !isExtraUnlocked()) return;
  if (activeProfileId) profileSet(DIFFICULTY_KEY, difficultyId);
  if (difficultyReturnTo === 'permTree') ScreenUI.onLeavePermTree(true);
  ScreenUI.close('difficulty');
  startGame(false);
}

function initDifficulty() {
  document.querySelectorAll('.diff-option').forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });
  document.getElementById('difficultyBackBtn')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    closeDifficultySelect();
  });
  document.getElementById('difficultyStartBtn')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    confirmDifficultyStart();
  });
  document.getElementById('difficultyOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'difficultyOverlay') closeDifficultySelect();
  });
  updateDifficultyUI();
}

function updateTitleProfileUI() {
  const el = document.getElementById('overlayProfile');
  const p = getActiveProfile();
  if (!el) return;
  if (p) {
    el.textContent = `👤 ${p.name}`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

async function activateProfile(profileId) {
  const profile = getProfile(profileId);
  if (!profile) return false;

  if (activeProfileId && activeProfileId !== profileId) {
    try { savePerm(); saveHighscore(); } catch (e) {}
    if (CloudSync.isEnabled()) await CloudSync.flushActiveAccount();
  }

  activeProfileId = profileId;
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);

  if (CloudSync.isEnabled()) {
    await CloudSync.loadAccount(profileId);
    CloudSync.applyPermToGame();
    loadHighscore();
  } else {
    loadPerm();
    loadHighscore();
  }
  loadDifficulty();
  Achievements.load();
  updateTitleProfileUI();
  return true;
}

function getProfileSearchQuery() {
  return (document.getElementById('profileSearchInput')?.value || '').trim().toLowerCase();
}

// ===== PROFILE UI =====
function updateProfileSearchToolsVisibility() {
  const tools = document.getElementById('profileSearchTools');
  const creating = !document.getElementById('profileCreateForm')?.classList.contains('hidden');
  if (!tools) return;
  tools.classList.toggle('hidden', creating || profilesRegistry.profiles.length === 0);
}

function renderProfileList() {
  const list = document.getElementById('profileList');
  const meta = document.getElementById('profileSearchMeta');
  if (!list) return;
  list.innerHTML = '';
  updateProfileSearchToolsVisibility();

  const total = profilesRegistry.profiles.length;
  if (total === 0) {
    list.classList.add('hidden');
    if (meta) meta.textContent = '';
    return;
  }

  const query = getProfileSearchQuery();
  const sorted = [...profilesRegistry.profiles].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const profiles = query
    ? sorted.filter(p => p.name.toLowerCase().includes(query))
    : sorted;

  if (meta) {
    meta.textContent = query
      ? `${profiles.length} 件ヒット / 全 ${total} 件`
      : `全 ${total} 件（最大 ${MAX_PROFILES} 件）`;
  }

  if (profiles.length === 0) {
    list.innerHTML = '<div class="profile-empty-hint">該当するアカウントがありません<br>検索キーワードを変えてください</div>';
    list.classList.remove('hidden');
    return;
  }

  profiles.forEach(p => {
    const { pts, hs } = readProfileSummary(p.id);
    const card = document.createElement('div');
    card.className = 'profile-card' + (p.id === activeProfileId ? ' active' : '');
    card.innerHTML = `
      <div class="profile-card-icon">👤</div>
      <div class="profile-card-body">
        <div class="profile-card-name">${escapeHtml(p.name)}</div>
        <div class="profile-card-meta">PT ${pts} · HI ${hs.toLocaleString()}</div>
      </div>
      ${total > 1 && !profileGateMode && debugUnlocked ? `<button type="button" class="profile-card-del" title="削除（デバッグ）">×</button>` : ''}
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.profile-card-del')) return;
      Sfx.play('ui', true);
      selectProfile(p.id);
    });
    const delBtn = card.querySelector('.profile-card-del');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProfile(p.id);
      });
    }
    list.appendChild(card);
  });
  list.classList.remove('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clearProfileForms() {
  document.getElementById('profileCreateForm')?.classList.add('hidden');
  document.getElementById('profileFormError').textContent = '';
  document.getElementById('profileListError').textContent = '';
}

function showCreateForm() {
  if (profilesRegistry.profiles.length >= MAX_PROFILES) {
    document.getElementById('profileListError').textContent = `アカウントは最大 ${MAX_PROFILES} 件までです。`;
    return;
  }
  clearProfileForms();
  document.getElementById('profileNameInput').value = '';
  document.getElementById('profileCreateForm').classList.remove('hidden');
  document.getElementById('profileMainActions').classList.add('hidden');
  document.getElementById('profileList').classList.add('hidden');
  document.getElementById('profileSearchTools')?.classList.add('hidden');
  setTimeout(() => document.getElementById('profileNameInput')?.focus(), 50);
}

function hideCreateForm() {
  document.getElementById('profileCreateForm')?.classList.add('hidden');
  document.getElementById('profileMainActions')?.classList.remove('hidden');
  document.getElementById('profileList')?.classList.remove('hidden');
  renderProfileList();
  updateProfileActionButtons();
}

function closeProfileOverlay() {
  if (profileGateMode) return;
  clearProfileForms();
  ScreenUI.close('profile');
}

function updateProfileActionButtons() {
  const canCreate = profilesRegistry.profiles.length < MAX_PROFILES;
  document.getElementById('profileCreateBtn')?.classList.toggle('hidden', !canCreate);
}

function finishProfileSelection() {
  profileGateMode = false;
  clearProfileForms();
  ScreenUI.close('profile');
  updateTitleProfileUI();
  if (Tutorial && typeof Tutorial.maybeAutoOpen === 'function') Tutorial.maybeAutoOpen();
}

function openProfileOverlay(gate = false) {
  ScreenUI.dismissHint(false);
  profileGateMode = gate;
  clearProfileForms();
  const searchInput = document.getElementById('profileSearchInput');
  if (searchInput) searchInput.value = '';
  const title = document.getElementById('profilePanelTitle');
  const sub = document.getElementById('profilePanelSub');
  const closeBtn = document.getElementById('profileCloseBtn');
  if (gate) {
    title.textContent = profilesRegistry.profiles.length ? 'ゲームアカウントを選んでください' : 'ゲームアカウントがありません';
    sub.textContent = CloudSync.isEnabled()
      ? 'みんなで同じゲームアカウント（A/B/C…）を共有します'
      : (profilesRegistry.profiles.length
        ? '一覧から選んでください（オフライン・この端末のみ）'
        : '名前を入力して新しいゲームアカウントを作成してください');
    closeBtn.classList.add('hidden');
  } else {
    title.textContent = 'ゲームアカウント切替';
    sub.textContent = CloudSync.isEnabled()
      ? '別のゲームアカウントを選びます（セーブデータはクラウドで共有）'
      : '別のゲームアカウントを選びます（この端末のデータ）';
    closeBtn.classList.remove('hidden');
  }
  updateProfileActionButtons();
  renderProfileList();
  if (gate && profilesRegistry.profiles.length === 0) {
    showCreateForm();
  }
  ScreenUI.open('profile');
}

async function selectProfile(profileId) {
  if (await activateProfile(profileId)) finishProfileSelection();
}

async function createProfile() {
  const nameRaw = (document.getElementById('profileNameInput')?.value || '').trim();
  const errEl = document.getElementById('profileFormError');
  if (!nameRaw) {
    errEl.textContent = '名前を入力してください。';
    return;
  }
  if (profilesRegistry.profiles.length >= MAX_PROFILES) {
    errEl.textContent = `アカウントは最大 ${MAX_PROFILES} 件までです。`;
    return;
  }
  let id;
  if (CloudSync.isEnabled()) {
    id = await CloudSync.createAccount(nameRaw.slice(0, 12));
    if (!id) return;
    await CloudSync.refreshAccountList();
  } else {
    id = generateProfileId();
    profilesRegistry.profiles.push({
      id,
      name: nameRaw.slice(0, 12),
      createdAt: Date.now(),
    });
    saveProfilesRegistry();
  }
  Sfx.play('ui', true);
  hideCreateForm();
  await activateProfile(id);
  finishProfileSelection();
}

async function deleteProfile(profileId) {
  if (!debugUnlocked) return;
  const profile = getProfile(profileId);
  if (!profile) return;
  if (!confirm(`「${profile.name}」のデータを削除しますか？\n（元に戻せません）`)) return;
  if (CloudSync.isEnabled()) {
    await CloudSync.deleteAccount(profileId);
  } else {
    profilesRegistry.profiles = profilesRegistry.profiles.filter(p => p.id !== profileId);
    saveProfilesRegistry();
    deleteProfileData(profileId);
  }
  if (activeProfileId === profileId) {
    activeProfileId = null;
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    if (!CloudSync.isEnabled()) {
      permPoints = 0;
      activeCharId = 'blaster';
      ownedChars = ['blaster'];
      Object.keys(charPermData).forEach(k => delete charPermData[k]);
      charPermData.blaster = {};
      Object.keys(charPermActiveData).forEach(k => delete charPermActiveData[k]);
      charPermActiveData.blaster = {};
      Object.keys(permLevels).forEach(k => delete permLevels[k]);
      Object.keys(permActiveLevels).forEach(k => delete permActiveLevels[k]);
    }
    highscore = 0;
    highscoresByDiff = emptyHighscores();
    updateTitleProfileUI();
    openProfileOverlay(true);
    if (profilesRegistry.profiles.length === 0) showCreateForm();
    return;
  }
  renderProfileList();
  updateProfileActionButtons();
}

async function continueProfileBootstrap() {
  const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (savedId && getProfile(savedId)) await activateProfile(savedId);
  else if (!activeProfileId) openProfileOverlay(true);
  else updateTitleProfileUI();
}

async function bootstrapAccounts() {
  migrateLegacySaveIfNeeded();
  const cloudOk = await CloudSync.init();
  if (cloudOk) {
    await CloudSync.seedIfEmpty();
    await CloudSync.refreshAccountList();
  } else {
    loadProfilesRegistry();
  }
  await continueProfileBootstrap();
}

// ===== PROFILE UI (events) =====
function initProfiles() {
  document.getElementById('profileCreateBtn')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    showCreateForm();
  });
  document.getElementById('profileFormCancel')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    hideCreateForm();
    if (profileGateMode && profilesRegistry.profiles.length === 0) showCreateForm();
  });
  document.getElementById('profileFormSubmit')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    createProfile();
  });
  document.getElementById('profileCloseBtn')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    closeProfileOverlay();
  });
  document.getElementById('profileSwitchBtn')?.addEventListener('click', () => {
    if (state !== 'title') return;
    Sfx.play('ui', true);
    openProfileOverlay(false);
  });
  document.getElementById('profileNameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') createProfile();
  });
  document.getElementById('profileSearchInput')?.addEventListener('input', () => {
    renderProfileList();
  });
  document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
    if (state !== 'title') return;
    Sfx.play('ui', true);
    openLeaderboard();
  });
  document.getElementById('leaderboardCloseBtn')?.addEventListener('click', () => {
    Sfx.play('ui', true);
    closeLeaderboard();
  });
  document.querySelectorAll('.leaderboard-diff-tab').forEach(btn => {
    btn.addEventListener('click', () => setLeaderboardDifficulty(btn.dataset.lbDiff));
  });
  document.querySelectorAll('.leaderboard-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setLeaderboardMode(btn.dataset.lbMode));
  });
}

// ===== FEEDBACK =====
const FEEDBACK_LOCAL_KEY = 'starblaster_feedback_v1';
const FEEDBACK_CATEGORIES = {
  opinion: '意見',
  request: '要望',
  bug: 'バグ報告',
  other: 'その他',
};

const Feedback = (() => {
  function categoryLabel(id) {
    return FEEDBACK_CATEGORIES[id] || id || 'その他';
  }

  function resetForm() {
    document.getElementById('feedbackCategory').value = 'opinion';
    document.getElementById('feedbackText').value = '';
    document.getElementById('feedbackFormError').textContent = '';
    document.getElementById('feedbackFormOk')?.classList.add('hidden');
  }

  function openOverlay() {
    if (state !== 'title') return;
    ScreenUI.dismissHint(false);
    resetForm();
    ScreenUI.open('feedback');
    setTimeout(() => document.getElementById('feedbackText')?.focus(), 50);
  }

  function closeOverlay() {
    ScreenUI.close('feedback');
  }

  async function submitForm() {
    const category = document.getElementById('feedbackCategory')?.value || 'other';
    const text = (document.getElementById('feedbackText')?.value || '').trim();
    const errEl = document.getElementById('feedbackFormError');
    const okEl = document.getElementById('feedbackFormOk');
    errEl.textContent = '';
    okEl?.classList.add('hidden');
    if (!text) {
      errEl.textContent = '内容を入力してください。';
      return;
    }
    const payload = {
      category,
      text: text.slice(0, 500),
      profileName: getActiveProfile()?.name || '',
      createdAt: Date.now(),
    };
    try {
      if (okEl) okEl.textContent = '送信しました。ありがとうございます！';
      if (CloudSync.isEnabled()) {
        try {
          await CloudSync.submitFeedback(payload);
        } catch (cloudErr) {
          console.warn('feedback cloud failed', cloudErr);
          const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
          list.unshift({ id: 'local_' + Date.now(), ...payload });
          localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
          if (okEl) okEl.textContent = '送信しました（クラウド未設定のためこの端末に保存）';
          Sfx.play('ui', true);
          okEl?.classList.remove('hidden');
          document.getElementById('feedbackText').value = '';
          setTimeout(() => closeOverlay(), 1400);
          return;
        }
      } else {
        const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
        list.unshift({ id: 'local_' + Date.now(), ...payload });
        localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
      }
      Sfx.play('ui', true);
      okEl?.classList.remove('hidden');
      document.getElementById('feedbackText').value = '';
      setTimeout(() => closeOverlay(), 1200);
    } catch (e) {
      errEl.textContent = '送信に失敗しました。あとでもう一度お試しください。';
    }
  }

  async function listAll() {
    let local = [];
    try { local = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]'); } catch (e) {}
    if (CloudSync.isEnabled()) {
      try {
        const cloud = await CloudSync.listFeedback();
        const merged = [...cloud];
        local.forEach(item => {
          if (!merged.some(m => m.id === item.id)) merged.push(item);
        });
        merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return merged.slice(0, 100);
      } catch (e) {
        return local;
      }
    }
    return local;
  }

  async function deleteItem(id) {
    if (!debugUnlocked || !id) return;
    const idStr = String(id);
    if (CloudSync.isEnabled() && !idStr.startsWith('local_')) {
      try {
        await CloudSync.deleteFeedback(idStr);
      } catch (e) {
        console.warn('feedback delete cloud failed', e);
      }
    }
    try {
      const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
      const filtered = list.filter(item => item.id !== idStr);
      if (filtered.length !== list.length) {
        localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(filtered));
      }
    } catch (e) {}
    Sfx.play('ui', true);
    await renderDebugList();
  }

  async function renderDebugList() {
    const wrap = document.getElementById('debugFeedbackList');
    if (!wrap) return;
    wrap.innerHTML = '<div class="feedback-debug-loading">読み込み中…</div>';
    const items = await listAll();
    if (!items.length) {
      wrap.innerHTML = '<div class="feedback-debug-empty">まだ投稿がありません</div>';
      return;
    }
    wrap.innerHTML = items.map(item => {
      const date = item.createdAt
        ? new Date(item.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
      const who = item.profileName ? escapeHtml(item.profileName) : '匿名';
      const delBtn = debugUnlocked
        ? `<button type="button" class="feedback-debug-del" data-id="${escapeHtml(item.id)}" title="削除（デバッグ）">×</button>`
        : '';
      return `<div class="feedback-debug-item">
        <div class="feedback-debug-head">
          <div class="feedback-debug-meta">${escapeHtml(categoryLabel(item.category))} · ${who} · ${date}</div>
          ${delBtn}
        </div>
        <div class="feedback-debug-text">${escapeHtml(item.text || '')}</div>
      </div>`;
    }).join('');
  }

  function init() {
    document.getElementById('feedbackBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      openOverlay();
    });
    document.getElementById('feedbackCancelBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      closeOverlay();
    });
    document.getElementById('feedbackSubmitBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      submitForm();
    });
    document.getElementById('feedbackOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'feedbackOverlay') closeOverlay();
    });
    document.getElementById('debugFeedbackRefresh')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      renderDebugList();
    });
    document.getElementById('debugFeedbackList')?.addEventListener('click', e => {
      const btn = e.target.closest('.feedback-debug-del');
      if (!btn || !debugUnlocked) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      if (id) deleteItem(id);
    });
  }

  return { init, openOverlay, closeOverlay, renderDebugList, deleteItem };
})();

