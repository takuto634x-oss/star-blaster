// ===== SCREEN UI (オーバーレイ一元管理) =====
const ScreenUI = (() => {
  const LAYER = {
    title: 'overlay',
    upgrade: 'upgradeOverlay',
    permTree: 'permTreeOverlay',
    profile: 'profileOverlay',
    leaderboard: 'leaderboardOverlay',
    feedback: 'feedbackOverlay',
    difficulty: 'difficultyOverlay',
    tutorial: 'tutorialOverlay',
    hint: 'contextHint',
    debug: 'debugOverlay',
    charSelect: 'charSelectOverlay',
  };

  const HINTS = {
    shop: {
      key: 'starblaster_hint_shop_v1',
      title: 'ショップ画面です',
      body: 'ウェーブクリアおめでとう！\n\nこの画面で PT を使って強化を選びます。\n1枚選んで購入 → 足りなければそのまま進んでもOK。\n\n最後に「次のウェーブへ ▶」を押すと、再びプレイ画面に戻ります。',
      screen: 'upgrade',
    },
    perm: {
      key: 'starblaster_hint_perm_v1',
      title: '永続強化ツリー',
      body: 'GAME OVER 後の画面です。\n\n獲得した PT で丸いノードをタップして永続強化を購入できます。\n\n準備ができたら「新しいゲームを始める ▶」を押してください。',
      screen: 'permTree',
    },
  };

  let hintTimer = null;
  let mainTutorialTimer = null;

  function el(layer) { return document.getElementById(LAYER[layer]); }
  function isOpen(layer) {
    const node = el(layer);
    return !!(node && !node.classList.contains('hidden'));
  }

  function close(layer) { el(layer)?.classList.add('hidden'); }
  function open(layer) { el(layer)?.classList.remove('hidden'); }

  function cancelHintTimer() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  }

  function cancelMainTutorialTimer() {
    if (mainTutorialTimer) {
      clearTimeout(mainTutorialTimer);
      mainTutorialTimer = null;
    }
  }

  function dismissHint(markSeen = true) {
    cancelHintTimer();
    const hintEl = el('hint');
    if (!hintEl || hintEl.classList.contains('hidden')) return;
    const storageKey = hintEl.dataset.storageKey;
    if (markSeen && storageKey && activeProfileId) profileSet(storageKey, '1');
    close('hint');
    hintEl.dataset.storageKey = '';
  }

  function hideHintForKey(storageKey, markSeen = false) {
    const hintEl = el('hint');
    if (!hintEl || hintEl.dataset.storageKey !== storageKey) return;
    if (markSeen && activeProfileId) profileSet(storageKey, '1');
    close('hint');
    hintEl.dataset.storageKey = '';
  }

  function closeAllExcept(...keepLayers) {
    Object.keys(LAYER).forEach(layer => {
      if (!keepLayers.includes(layer)) close(layer);
    });
  }

  /** プレイ画面へ入る前 — モーダル・ヒントをすべて片付ける */
  function prepareForPlay() {
    cancelHintTimer();
    cancelMainTutorialTimer();
    dismissHint(true);
    close('title');
    close('upgrade');
    close('permTree');
    close('charSelect');
    close('debug');
    close('leaderboard');
    close('profile');
    close('feedback');
    close('difficulty');
    close('tutorial');
    close('hint');
  }

  function scheduleContextHint(hintId) {
    const spec = HINTS[hintId];
    if (!spec) return;
    cancelHintTimer();
    if (!activeProfileId || profileGet(spec.key) === '1') return;
    hintTimer = setTimeout(() => {
      hintTimer = null;
      if (!isOpen(spec.screen)) return;
      if (state === 'playing') return;
      document.getElementById('contextHintTitle').textContent = spec.title;
      document.getElementById('contextHintBody').textContent = spec.body;
      const hintEl = el('hint');
      hintEl.dataset.storageKey = spec.key;
      open('hint');
    }, 300);
  }

  function onLeavePermTree(markSeen = false) {
    cancelHintTimer();
    hideHintForKey(HINTS.perm.key, markSeen);
  }

  function canAutoOpenMainTutorial() {
    return state === 'title'
      && isOpen('title')
      && !isOpen('profile')
      && !isOpen('leaderboard')
      && !isOpen('feedback')
      && !isOpen('difficulty')
      && !isOpen('permTree')
      && !isOpen('upgrade')
      && !isOpen('tutorial')
      && !isOpen('hint');
  }

  function scheduleMainTutorial(openFn) {
    cancelMainTutorialTimer();
    mainTutorialTimer = setTimeout(() => {
      mainTutorialTimer = null;
      if (canAutoOpenMainTutorial()) openFn(true);
    }, 400);
  }

  function init() {
    document.getElementById('contextHintOk')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      dismissHint(true);
    });
  }

  return {
    LAYER, isOpen, open, close, closeAllExcept,
    prepareForPlay, dismissHint, scheduleContextHint,
    onLeavePermTree, canAutoOpenMainTutorial, scheduleMainTutorial, init,
  };
})();

