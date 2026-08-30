-- LimiterService.lua (Server)
-- プレイヤーごとのリミッター比率を管理するサービス
-- RemoteEvent/RemoteFunction でクライアントと通信する

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService        = game:GetService("RunService")

local Shared        = ReplicatedStorage:WaitForChild("Shared")
local LimiterConfig = require(Shared:WaitForChild("LimiterConfig"))

-- ========== Remote の準備 ==========
-- Rojo で Remotes フォルダを作っていない場合は実行時に生成
local Remotes = ReplicatedStorage:FindFirstChild("Remotes")
if not Remotes then
    Remotes = Instance.new("Folder")
    Remotes.Name = "Remotes"
    Remotes.Parent = ReplicatedStorage
end

local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then
        obj = Instance.new(className)
        obj.Name = name
        obj.Parent = parent
    end
    return obj
end

-- クライアント → サーバー: リミッター比率変更要求
local SetLimiterRatio  = getOrCreate("RemoteEvent",    "SetLimiterRatio",  Remotes)
-- サーバー → クライアント: 比率変更を全員に通知
local LimiterChanged   = getOrCreate("RemoteEvent",    "LimiterChanged",   Remotes)
-- クライアント → サーバー: 現在の比率を問い合わせ
local GetLimiterRatio  = getOrCreate("RemoteFunction", "GetLimiterRatio",  Remotes)

-- ========== 内部データ ==========
local playerData = {}
-- playerData[userId] = {
--   ratio        : number (0〜1),
--   targetRatio  : number,
--   lastChanged  : number (tick),
--   stats        : table,
-- }

local function initPlayer(player)
    local preset = LimiterConfig.PRESETS[LimiterConfig.DEFAULT_PRESET]
    local ratio  = preset.ratio
    playerData[player.UserId] = {
        ratio       = ratio,
        targetRatio = ratio,
        lastChanged = 0,
        stats       = LimiterConfig.calcStats(ratio),
    }
end

local function applyStatsToCharacter(player, stats)
    local character = player.Character
    if not character then return end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    humanoid.MaxHealth = stats.maxHP
    -- HP が新しい上限を超えていたら丸める
    if humanoid.Health > stats.maxHP then
        humanoid.Health = stats.maxHP
    end

    humanoid.WalkSpeed = stats.walkSpeed

    -- damageMult は StringValue として Character に保存し、
    -- ダメージ計算スクリプト (GameManager) が参照する
    local dmgAttr = character:FindFirstChild("DamageMult")
    if not dmgAttr then
        dmgAttr = Instance.new("NumberValue")
        dmgAttr.Name = "DamageMult"
        dmgAttr.Parent = character
    end
    dmgAttr.Value = stats.damageMult
end

-- ========== リミッター比率セット (外部API) ==========
local LimiterService = {}

function LimiterService.setRatio(player, newRatio)
    local data = playerData[player.UserId]
    if not data then return end

    -- クールダウンチェック
    if tick() - data.lastChanged < LimiterConfig.CHANGE_COOLDOWN then
        return false, "クールダウン中"
    end

    newRatio = math.clamp(newRatio, 0, 1)
    data.targetRatio = newRatio
    data.lastChanged = tick()

    -- スムーズ補間は RunService.Heartbeat で行う
    -- 即時適用したい場合はここで ratio もセット
    data.ratio = newRatio
    data.stats = LimiterConfig.calcStats(newRatio)

    applyStatsToCharacter(player, data.stats)

    -- 全クライアントへ通知 (他プレイヤーのゲージ表示など)
    LimiterChanged:FireAllClients(player.UserId, newRatio, data.stats)

    return true
end

function LimiterService.getRatio(player)
    local data = playerData[player.UserId]
    return data and data.ratio or 0.5
end

function LimiterService.getStats(player)
    local data = playerData[player.UserId]
    return data and data.stats or LimiterConfig.calcStats(0.5)
end

-- ========== Remote ハンドラ ==========
SetLimiterRatio.OnServerEvent:Connect(function(player, newRatio)
    if type(newRatio) ~= "number" then return end
    LimiterService.setRatio(player, newRatio)
end)

GetLimiterRatio.OnServerInvoke = function(player)
    return LimiterService.getRatio(player)
end

-- ========== プレイヤーイベント ==========
Players.PlayerAdded:Connect(function(player)
    initPlayer(player)

    player.CharacterAdded:Connect(function(_character)
        -- キャラクタースポーン後にステータスを適用
        task.defer(function()
            local data = playerData[player.UserId]
            if data then
                applyStatsToCharacter(player, data.stats)
            end
        end)
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    playerData[player.UserId] = nil
end)

-- 既に入室済みのプレイヤー対応 (Studio テスト用)
for _, player in ipairs(Players:GetPlayers()) do
    initPlayer(player)
end

return LimiterService
