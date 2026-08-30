-- WeaponData.lua
-- 武器の基本データ定義 (共有モジュール)
-- ダメージは LimiterConfig.damageMult で乗算される

local WeaponData = {}

WeaponData.WEAPONS = {

    -- ========== ライフル ==========
    ASSAULT_RIFLE = {
        name         = "アサルトライフル",
        toolName     = "AssaultRifle",    -- Roblox Tool のインスタンス名
        baseDamage   = 20,
        fireRate     = 0.12,             -- 秒/発
        magazine     = 30,
        reloadTime   = 2.0,
        range        = 300,
        spread       = 2.0,              -- 拡散角度 (度)
        recoil       = 0.8,
        isAutomatic  = true,
        projectile   = "Bullet",
    },

    -- ========== ショットガン ==========
    SHOTGUN = {
        name         = "ショットガン",
        toolName     = "Shotgun",
        baseDamage   = 12,               -- 1ペレット当たり
        pellets      = 8,
        fireRate     = 0.9,
        magazine     = 6,
        reloadTime   = 0.5,              -- 1発ずつリロード
        range        = 80,
        spread       = 8.0,
        recoil       = 3.0,
        isAutomatic  = false,
        projectile   = "Pellet",
    },

    -- ========== スナイパー ==========
    SNIPER = {
        name         = "スナイパーライフル",
        toolName     = "Sniper",
        baseDamage   = 95,
        fireRate     = 1.5,
        magazine     = 5,
        reloadTime   = 2.5,
        range        = 1000,
        spread       = 0.1,
        recoil       = 5.0,
        isAutomatic  = false,
        projectile   = "SniperBullet",
        canHeadshot  = true,            -- ヘッドショット可能
        headshotMult = 1.5,
    },

    -- ========== SMG ==========
    SMG = {
        name         = "SMG",
        toolName     = "SMG",
        baseDamage   = 14,
        fireRate     = 0.08,
        magazine     = 40,
        reloadTime   = 1.6,
        range        = 150,
        spread       = 4.0,
        recoil       = 0.5,
        isAutomatic  = true,
        projectile   = "Bullet",
    },
}

-- ツール名からデータを検索
function WeaponData.getByToolName(toolName)
    for _, data in pairs(WeaponData.WEAPONS) do
        if data.toolName == toolName then
            return data
        end
    end
    return nil
end

return WeaponData
