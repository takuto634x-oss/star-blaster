-- init.server.lua
-- サーバーの起動エントリポイント
-- ★ 依存関係の順番に require する

-- 共有データ定義 (依存なし)
-- LimiterConfig, WeaponData は各サービスが直接 require

-- プレイヤーデータ管理 (他サービスが依存)
require(script.PlayerDataService)

-- リミッター管理
require(script.LimiterService)

-- ゲームロジック
require(script.RoundManager)
require(script.GameManager)

-- マッチメイキング
require(script.MatchmakingService)   -- カジュアルロビー
require(script.RankedService)         -- ランク戦

print("[THE LIMITER] サーバー初期化完了")
