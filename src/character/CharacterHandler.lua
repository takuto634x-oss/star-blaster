-- CharacterHandler.lua (StarterCharacterScripts)
-- キャラクタースポーン後のローカル処理
-- (アニメーション補助、エフェクトなど将来的に拡張)

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes        = ReplicatedStorage:WaitForChild("Remotes")
local LimiterChanged = Remotes:WaitForChild("LimiterChanged")

local localPlayer = Players.LocalPlayer
local character   = script.Parent  -- StarterCharacterScripts の場合はキャラクター

-- ========== HP バーの色変更 ==========
-- リミッター比率に応じてキャラクターの名前/HPバー色を変える

local function applyVisualEffect(ratio)
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    -- 比率が高い (攻撃型) → 赤め、低い (タンク型) → 青め
    local r = math.floor(80 + 175 * ratio)
    local b = math.floor(255 - 175 * ratio)
    -- HealthDisplayDistance などの調整
    humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.DisplayWhenDamaged
end

-- 初期適用
applyVisualEffect(0.5)

-- サーバーからの変更通知を受け取って見た目を更新
LimiterChanged.OnClientEvent:Connect(function(userId, newRatio, _stats)
    if userId == localPlayer.UserId then
        applyVisualEffect(newRatio)
    end
end)
