# THE LIMITER

Roblox 銃ゲーム × リミッターシステム

## コンセプト

「リミッター」とは、**攻撃力と HP の比率をリアルタイムで変更できる能力**です。

- 攻撃比率を上げる → ダメージ増加 / HP 減少 / 移動速度増加
- 攻撃比率を下げる → ダメージ減少 / HP 増加 / 移動速度減少

試合中いつでも変更可能（2秒のクールダウンあり）。

## ディレクトリ構成 (Rojo)

```
the-limiter/
├── default.project.json    # Rojo マッピング設定
└── src/
    ├── server/
    │   ├── init.server.lua      # サーバーエントリポイント
    │   ├── LimiterService.lua   # リミッター管理・ステータス計算
    │   └── GameManager.lua      # ダメージ処理・スコア管理
    ├── shared/
    │   ├── LimiterConfig.lua    # 設定値・計算式
    │   └── WeaponData.lua       # 武器パラメータ定義
    ├── client/
    │   ├── init.client.lua      # クライアントエントリポイント
    │   ├── LimiterUI.lua        # リミッタースライダーUI
    │   └── WeaponController.lua # 射撃入力処理
    └── character/
        └── CharacterHandler.lua # キャラクタービジュアル処理
```

## セットアップ

1. [Rojo](https://rojo.space/) をインストール
2. VS Code の Rojo 拡張を入れる
3. `rojo serve` を実行
4. Roblox Studio で Rojo プラグインから接続

## リミッタープリセット

| 名前 | 攻撃比率 | 説明 |
|------|---------|------|
| ガラス砲 | 0.90 | 攻撃力MAX / HP極小 |
| アグレッシブ | 0.70 | 高攻撃力 / 低HP |
| バランス | 0.50 | 標準 |
| ディフェンシブ | 0.30 | 低攻撃力 / 高HP |
| フルタンク | 0.10 | 攻撃力極小 / HP MAX |

## 今後の拡張案

- [ ] マップ (スモールアリーナ) の実装
- [ ] キルフィード UI
- [ ] リスポーンシステム
- [ ] ラウンド制ゲームループ
- [ ] 武器ピックアップ・ショップシステム
