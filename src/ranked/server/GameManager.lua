-- GameManager.lua (Server)
-- 試合のライフサイクル管理・ダメージ処理

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared        = ReplicatedStorage:WaitForChild("Shared")
local LimiterConfig = require(Shared:WaitForChild("LimiterConfig"))
local WeaponData    = require(Shared:WaitForChild("WeaponData"))
local LimiterService  = require(script.Parent:WaitForChild("LimiterService"))
local RoundManager    = require(script.Parent:WaitForChild("RoundManager"))

-- ========== Remote ==========
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then
        obj = Instance.new(className)
        obj.Name = name
        obj.Parent = parent
    end
    return obj
end

-- クライアント → サーバー: 射撃リクエスト
local FireWeapon   = getOrCreate("RemoteEvent",    "FireWeapon",   Remotes)
-- サーバー → クライアント: キル/デスフィード
local KillFeed     = getOrCreate("RemoteEvent",    "KillFeed",     Remotes)
-- サーバー → 全クライアント: スコア更新
local ScoreUpdate  = getOrCreate("RemoteEvent",    "ScoreUpdate",  Remotes)

-- ========== スコアボード ==========
local scores = {}  -- [userId] = {kills=0, deaths=0}

local function initScore(player)
    scores[player.UserId] = { kills = 0, deaths = 0 }
end

local function broadcastScores()
    local list = {}
    for userId, s in pairs(scores) do
        local player = Players:GetPlayerByUserId(userId)
        if player then
            table.insert(list, {
                name   = player.Name,
                kills  = s.kills,
                deaths = s.deaths,
            })
        end
    end
    -- キル数降順でソート
    table.sort(list, function(a, b) return a.kills > b.kills end)
    ScoreUpdate:FireAllClients(list)
end

-- ========== ダメージ計算 ==========
-- hitPart: 当たった部位 (パーツ名)
local function calcDamage(attacker, weaponName, hitPart)
    local wData = WeaponData.getByToolName(weaponName)
    if not wData then return 0 end

    local baseDmg = wData.baseDamage

    -- リミッターのダメージ倍率を取得
    local dmgMult = 1.0
    local character = attacker.Character
    if character then
        local dmgAttr = character:FindFirstChild("DamageMult")
        if dmgAttr then dmgMult = dmgAttr.Value end
    end

    local damage = baseDmg * dmgMult

    -- ヘッドショット
    if wData.canHeadshot and hitPart == "Head" then
        damage = damage * (wData.headshotMult or 1.5)
    end

    -- ショットガンはペレット1発分なのでそのまま
    return damage
end

-- ========== 射撃ハンドラ ==========
-- 注: ダメージ計算は試合中/ロビー問わず受け付ける (RoundManager 側でキル通知を制御)
FireWeapon.OnServerEvent:Connect(function(attacker, targetCharacter, hitPart, weaponName)
    -- 入力バリデーション
    if not attacker or not attacker.Character then return end
    if not targetCharacter or not targetCharacter:IsDescendantOf(game.Workspace) then return end

    local humanoid = targetCharacter:FindFirstChildOfClass("Humanoid")
    if not humanoid or humanoid.Health <= 0 then return end

    -- 自分自身への射撃は無効
    local victim = Players:GetPlayerFromCharacter(targetCharacter)
    if victim == attacker then return end

    local damage = calcDamage(attacker, weaponName, hitPart)
    humanoid:TakeDamage(damage)

    -- 死亡チェック
    if humanoid.Health <= 0 then
        -- スコア更新
        if scores[attacker.UserId] then
            scores[attacker.UserId].kills += 1
        end
        if victim and scores[victim.UserId] then
            scores[victim.UserId].deaths += 1
        end

        -- キルフィード通知
        KillFeed:FireAllClients(
            attacker.Name,
            victim and victim.Name or "?",
            weaponName,
            hitPart == "Head"
        )

        -- RoundManager にキルを通知
        RoundManager.onKill(attacker)

        broadcastScores()
    end
end)

-- ========== プレイヤー管理 ==========
Players.PlayerAdded:Connect(function(player)
    initScore(player)
end)

Players.PlayerRemoving:Connect(function(player)
    scores[player.UserId] = nil
end)

for _, player in ipairs(Players:GetPlayers()) do
    initScore(player)
end

print("[GameManager] 起動完了")
