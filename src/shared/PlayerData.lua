-- PlayerData.lua (Shared)
-- レベル・ランク層の定義 (サーバー・クライアント共通)

local PlayerData = {}

-- ========================================================
-- レベルシステム (カジュアル向け)
-- ========================================================
-- 1ゲームごとに xp += 100、累計 xp でレベル決定
-- xp 必要量: level^1.5 * 150

function PlayerData.xpForLevel(level)
    return math.floor(level ^ 1.5 * 150)
end

-- xp から現在レベルを逆算
function PlayerData.levelFromXp(xp)
    local lv = 1
    while PlayerData.xpForLevel(lv + 1) <= xp do
        lv += 1
        if lv >= 9999 then break end
    end
    return lv
end

-- レベルから「ブラケット番号」へ (5レベルごとに1ブラケット)
-- Lv1-5 → 1, Lv6-10 → 2, ...
function PlayerData.levelBracket(level)
    return math.ceil(level / 5)
end

-- ブラケット番号の表示名
function PlayerData.bracketLabel(bracket)
    local names = {
        "初心者", "見習い", "中級者", "上級者",
        "熟練者", "エキスパート", "マスター",
    }
    return names[math.min(bracket, #names)] or ("Lv." .. ((bracket-1)*5+1) .. "+")
end

-- ========================================================
-- ランクシステム (ランク戦向け)
-- ========================================================
PlayerData.DEFAULT_RANK_VALUE = 1000

-- ランク値からティア情報を返す
-- { name, colorR, colorG, colorB, minValue }
PlayerData.RANK_TIERS = {
    { name = "ブロンズ",  minValue = 0,    r = 180, g = 100, b = 50  },
    { name = "シルバー",  minValue = 1200, r = 170, g = 170, b = 190 },
    { name = "ゴールド",  minValue = 1500, r = 255, g = 200, b = 50  },
    { name = "ダイヤ",    minValue = 1800, r = 80,  g = 200, b = 255 },
    { name = "マスター",  minValue = 2100, r = 220, g = 100, b = 255 },
}

function PlayerData.getTier(rankValue)
    local tier = PlayerData.RANK_TIERS[1]
    for _, t in ipairs(PlayerData.RANK_TIERS) do
        if rankValue >= t.minValue then tier = t end
    end
    return tier
end

-- ランク戦の勝敗によるポイント変動
-- 勝者: +RP, 敗者: -RP (差が大きいほど勝時RP↑・負時RP↓が小さい)
function PlayerData.calcRpChange(myRank, opponentAvgRank, isWinner)
    local diff      = opponentAvgRank - myRank   -- 正=相手が格上
    local baseGain  = 25
    local baseLoss  = 20
    local adjust    = math.clamp(diff / 200, -0.5, 0.5)  -- ±50%調整

    if isWinner then
        return math.floor(baseGain * (1 + adjust))
    else
        return -math.floor(baseLoss * (1 - adjust))
    end
end

-- ランク戦のマッチング許容範囲 (待機時間に応じて広がる)
-- waitSec: 待機秒数
function PlayerData.searchRange(waitSec)
    local base   = 150
    local expand = math.floor(waitSec / 10) * 50   -- 10秒ごとに+50
    return math.min(base + expand, 600)
end

return PlayerData
