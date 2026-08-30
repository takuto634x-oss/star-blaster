-- init.client.lua
-- クライアントの起動エントリポイント
-- ★ MainMenuUI を最初に起動し、そこからカジュアル/ランクへ遷移する

-- HUD・武器系 (常時アクティブ)
require(script.Parent.HUD)
require(script.Parent.LimiterUI)
require(script.Parent.WeaponController)
require(script.Parent.MobileControls)

-- ロビーUI群 (デフォルト非表示のものは各スクリプト内で制御)
require(script.Parent.MatchmakingUI)   -- カジュアルロビー (MainMenuUI から開く)
require(script.Parent.RankedUI)         -- ランク戦ロビー   (MainMenuUI から開く)

-- メインメニュー (最後に起動: 他UIの準備が終わってから表示)
require(script.Parent.MainMenuUI)

print("[THE LIMITER] クライアント初期化完了")
