// ===== TUTORIAL =====
const Tutorial = (() => {
  const MAIN_KEY = 'starblaster_tutorial_v1';
  const FLOW_TEXT = '[タイトル] → [プレイ] → ウェーブクリア → [ショップ] → [プレイ] → … → ゲームオーバー → [永続強化] → 再スタート';

  let stepIndex = 0;
  let steps = [];

  function isTouch() { return isTouchDevice(); }

  function buildSteps() {
    const move = isTouch()
      ? '左下のスティックで移動'
      : '矢印キー / WASD で移動';
    const fire = isTouch() ? '右下 FIRE で射撃' : 'スペースキーで射撃';
    const sp = isTouch() ? 'SP ボタン' : 'Z キー';

    return [
      {
        title: 'STAR BLASTER へようこそ！',
        body: '縦スクロールシューティングです。\n画面がいくつかに分かれますが、流れはいつも同じです。\nまず全体の流れを覚えましょう。',
        flow: FLOW_TEXT,
      },
      {
        title: '基本操作',
        body: `${move}\n${fire}\n\n敵を倒してスコアを稼ぎ、ライフ（♥）を残して生き延びましょう。`,
      },
      {
        title: 'プレイ中の画面',
        body: '左上：スコア / 右上：ライフ\n中央上：LEVEL（ウェーブ数）\n左下：SPECIAL GAUGE（紫のゲージ）\n\n敵を倒すとゲージがたまり、MAXで強力な特殊攻撃が使えます。',
      },
      {
        title: '特殊攻撃',
        body: `ゲージが MAX になると発動可能。\n${sp} で特殊弾幕を撃てます。\n\n※ 発動後は約10秒クールダウン（その間ゲージは増えません）`,
      },
      {
        title: 'ウェーブクリア → ショップ',
        body: '敵をすべて倒すと「UPGRADE SHOP」画面に切り替わります。\n\nウェーブ間の強化タイムです。\nPT を使って能力を買い、「次のウェーブへ ▶」を押してください。',
      },
      {
        title: 'ショップのポイント',
        body: '・ウェーブクリアごとに PT がもらえます\n・カードをタップして強化を購入\n・「シャッフル」で候補を入れ替え（回数限定）\n・特殊能力は同時に4種類まで\n\n買い終わったら必ず「次のウェーブへ ▶」',
      },
      {
        title: '⚠ ゲームオーバー → 永続強化',
        body: 'ライフが 0 になると GAME OVER。\n数秒後、また別画面（永続強化ツリー）に切り替わります。\n\nここで PT を使うと、次回以降も効く永続アップグレードを購入できます。\n「新しいゲームを始める ▶」で再挑戦。',
      },
      {
        title: 'その他の便利機能',
        body: '・タイトルの「スタート」→ 難易度を選んでからプレイ\n・EXTRAは HARDでウェーブ25到達で解放\n・「キャラクター / 強化」→ いつでもツリーを確認\n・共有のゲームアカウントを選択\n・「ランキング」→ 難易度別ハイスコア\n・画面上部 1x/2x/4x → ゲーム速度\n・HD / LITE → 画質と軽さの切替\n\n準備OK！ スタートを押してプレイしましょう。',
      },
    ];
  }

  function renderStep() {
    const s = steps[stepIndex];
    document.getElementById('tutorialStep').textContent = `${stepIndex + 1} / ${steps.length}`;
    document.getElementById('tutorialTitle').textContent = s.title;
    document.getElementById('tutorialBody').textContent = s.body;
    const flowEl = document.getElementById('tutorialFlow');
    if (s.flow) {
      flowEl.textContent = s.flow;
      flowEl.classList.remove('hidden');
    } else {
      flowEl.classList.add('hidden');
    }
    document.getElementById('tutorialPrev').disabled = stepIndex <= 0;
    document.getElementById('tutorialNext').textContent = stepIndex >= steps.length - 1 ? '完了' : '次へ';
  }

  function openMain(fromAuto = false) {
    if (!ScreenUI.canAutoOpenMainTutorial() && fromAuto) return;
    ScreenUI.dismissHint(false);
    steps = buildSteps();
    stepIndex = 0;
    renderStep();
    ScreenUI.open('tutorial');
    if (fromAuto) Sfx.play('ui', true);
  }

  function closeMain(markDone) {
    ScreenUI.close('tutorial');
    if (markDone) profileSet(MAIN_KEY, '1');
  }

  function maybeAutoOpen() {
    if (profileGet(MAIN_KEY) === '1') return;
    ScreenUI.scheduleMainTutorial(openMain);
  }

  function init() {
    document.getElementById('tutorialBtn')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      openMain(false);
    });
    document.getElementById('tutorialSkip')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      closeMain(true);
    });
    document.getElementById('tutorialPrev')?.addEventListener('click', () => {
      if (stepIndex > 0) { stepIndex--; renderStep(); Sfx.play('ui', true); }
    });
    document.getElementById('tutorialNext')?.addEventListener('click', () => {
      Sfx.play('ui', true);
      if (stepIndex >= steps.length - 1) closeMain(true);
      else { stepIndex++; renderStep(); }
    });
  }

  return { init, openMain, maybeAutoOpen };
})();

