-- LimiterConfig.lua
-- リミッターシステムの設定値を管理する共有モジュール
--
-- ★ 核心メカニクス: ATK × HP = 定数 (双曲線)
--   → どのリミッター設定の相手とも、同じ弾数で倒し合える
--   例) ATK=200, HP=10  vs  ATK=2, HP=1000
--       200でHP1000を倒す弾数 = ceil(1000/200) = 5発
--       2でHP10を倒す弾数    = ceil(10/2)     = 5発  ✓ 同じ！

local LimiterConfig = {}

-- ========== 基本パラメータ ==========

-- ベースステータス (ratio=0.5 のときの値)
local BASE_DAMAGE  = 20    -- 1発あたりのベースダメージ
local BASE_HP      = 100   -- ベースHP
local BASE_SPEED   = 16    -- ベースウォークスピード

-- 倍率の幅: ratio=0 → 0.1倍, ratio=0.5 → 1.0倍, ratio=1.0 → 10倍
-- 10^(-1) ～ 10^(+1) の対数スケール
local LOG_RANGE    = 1.0   -- 10^(±LOG_RANGE) の幅

-- スピードはATK比率に緩く連動 (0.75倍 ～ 1.25倍)
local SPEED_MIN_MULT = 0.75
local SPEED_MAX_MULT = 1.25

-- ========== プリセット ==========
LimiterConfig.PRESETS = {
    GLASS_CANNON   = { ratio = 0.90, label = "ガラス砲",     description = "ATK極大 / HP極小" },
    AGGRESSIVE     = { ratio = 0.70, label = "アグレッシブ",  description = "高ATK / 低HP" },
    BALANCED       = { ratio = 0.50, label = "バランス",      description = "ATK・HPともに標準" },
    DEFENSIVE      = { ratio = 0.30, label = "ディフェンシブ", description = "低ATK / 高HP" },
    FULL_TANK      = { ratio = 0.10, label = "フルタンク",    description = "ATK極小 / HP極大" },
}

LimiterConfig.DEFAULT_PRESET = "BALANCED"

-- ========== リミッター変更設定 ==========
LimiterConfig.CHANGE_COOLDOWN = 2.0   -- 変更クールダウン (秒)

-- ========== 計算式 ==========

-- ratio (0~1) → ATK倍率 (対数スケール)
-- ratio=0 → 0.1倍, ratio=0.5 → 1.0倍, ratio=1.0 → 10倍
local function calcAtkMult(ratio)
    local logMult = (ratio - 0.5) * 2 * LOG_RANGE  -- -1.0 ～ +1.0
    return 10 ^ logMult
end

-- 全ステータスをまとめて返す
-- ★ HPはATK倍率の逆数なので ATK×HP = BASE_DAMAGE×BASE_HP = 定数
function LimiterConfig.calcStats(ratio)
    ratio = math.clamp(ratio, 0, 1)

    local atkMult = calcAtkMult(ratio)
    local hpMult  = 1 / atkMult        -- 逆数 → 積が常に1.0

    local damage    = BASE_DAMAGE * atkMult
    local maxHP     = math.floor(BASE_HP * hpMult)
    local walkSpeed = math.floor(BASE_SPEED * (SPEED_MIN_MULT + (SPEED_MAX_MULT - SPEED_MIN_MULT) * ratio))

    return {
        ratio      = ratio,
        damageMult = atkMult,           -- 武器のbaseDamageにこの値を掛ける
        damage     = math.floor(damage),
        maxHP      = math.max(maxHP, 1),
        walkSpeed  = walkSpeed,
    }
end

-- 検証用: 2つのratioで互いに何発で倒せるか (サーバーログ用)
function LimiterConfig.debugKillShots(ratioA, ratioB)
    local sA = LimiterConfig.calcStats(ratioA)
    local sB = LimiterConfig.calcStats(ratioB)
    local shotsAtoB = math.ceil(sB.maxHP / sA.damage)
    local shotsBtoA = math.ceil(sA.maxHP / sB.damage)
    return shotsAtoB, shotsBtoA
    -- 理論上 shotsAtoB == shotsBtoA になる
end

-- ステータスの見やすい表示文字列を返す
function LimiterConfig.statsToString(stats)
    return string.format(
        "ATK x%.2f | HP %d | SPD %d",
        stats.damageMult, stats.maxHP, stats.walkSpeed
    )
end

return LimiterConfig
