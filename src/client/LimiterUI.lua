-- LimiterUI.lua (Client)
-- リミッター操作UI: スライダー + プリセットボタン
-- ScreenGui は Rojo で StarterGui に配置するか、このスクリプトで動的生成

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService        = game:GetService("RunService")
local UserInputService  = game:GetService("UserInputService")
local TweenService      = game:GetService("TweenService")

local Shared        = ReplicatedStorage:WaitForChild("Shared")
local LimiterConfig = require(Shared:WaitForChild("LimiterConfig"))

local Remotes        = ReplicatedStorage:WaitForChild("Remotes")
local SetLimiterRatio = Remotes:WaitForChild("SetLimiterRatio")
local LimiterChanged  = Remotes:WaitForChild("LimiterChanged")
local GetLimiterRatio = Remotes:WaitForChild("GetLimiterRatio")

local localPlayer = Players.LocalPlayer

-- ========== 現在の比率 ==========
local currentRatio = GetLimiterRatio:InvokeServer()
local isOpen = false  -- UIパネルの開閉状態

-- ========== UI 構築 ==========
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "LimiterUI"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = localPlayer:WaitForChild("PlayerGui")

-- ---- トグルボタン (画面左下) ----
local toggleBtn = Instance.new("TextButton")
toggleBtn.Name = "ToggleButton"
toggleBtn.Size = UDim2.new(0, 120, 0, 40)
toggleBtn.Position = UDim2.new(0, 20, 1, -70)
toggleBtn.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
toggleBtn.TextColor3 = Color3.fromRGB(220, 220, 255)
toggleBtn.Font = Enum.Font.GothamBold
toggleBtn.TextSize = 14
toggleBtn.Text = "⚙ リミッター"
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 8)

-- ---- メインパネル ----
local panel = Instance.new("Frame")
panel.Name = "LimiterPanel"
panel.Size = UDim2.new(0, 320, 0, 340)
panel.Position = UDim2.new(0, 20, 1, -420)
panel.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
panel.BackgroundTransparency = 0.1
panel.Visible = false
panel.Parent = screenGui
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 12)

-- タイトル
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 36)
title.BackgroundTransparency = 1
title.Text = "⚡ LIMITER"
title.Font = Enum.Font.GothamBold
title.TextSize = 18
title.TextColor3 = Color3.fromRGB(255, 230, 80)
title.Parent = panel

-- ---- ステータス表示 ----
local statsFrame = Instance.new("Frame")
statsFrame.Size = UDim2.new(1, -20, 0, 80)
statsFrame.Position = UDim2.new(0, 10, 0, 42)
statsFrame.BackgroundColor3 = Color3.fromRGB(35, 35, 50)
statsFrame.Parent = panel
Instance.new("UICorner", statsFrame).CornerRadius = UDim.new(0, 8)

local function makeStatLabel(name, posY, color)
    local lbl = Instance.new("TextLabel")
    lbl.Name = name
    lbl.Size = UDim2.new(0.5, -4, 0, 24)
    lbl.Position = UDim2.new(0, 8, 0, posY)
    lbl.BackgroundTransparency = 1
    lbl.Font = Enum.Font.Gotham
    lbl.TextSize = 13
    lbl.TextColor3 = color
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.Parent = statsFrame
    return lbl
end

local hpLabel     = makeStatLabel("HP",     4,  Color3.fromRGB(100, 255, 100))
local dmgLabel    = makeStatLabel("DMG",    28, Color3.fromRGB(255, 120, 80))
local speedLabel  = makeStatLabel("SPD",    52, Color3.fromRGB(100, 180, 255))

-- ---- スライダー ----
local sliderLabel = Instance.new("TextLabel")
sliderLabel.Size = UDim2.new(1, -20, 0, 20)
sliderLabel.Position = UDim2.new(0, 10, 0, 130)
sliderLabel.BackgroundTransparency = 1
sliderLabel.Font = Enum.Font.Gotham
sliderLabel.TextSize = 12
sliderLabel.TextColor3 = Color3.fromRGB(180, 180, 220)
sliderLabel.TextXAlignment = Enum.TextXAlignment.Left
sliderLabel.Text = "🔫 攻撃 ←───────── バランス ─────────→ 🛡 HP"
sliderLabel.Parent = panel

local sliderTrack = Instance.new("Frame")
sliderTrack.Name = "SliderTrack"
sliderTrack.Size = UDim2.new(1, -30, 0, 10)
sliderTrack.Position = UDim2.new(0, 15, 0, 158)
sliderTrack.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
sliderTrack.Parent = panel
Instance.new("UICorner", sliderTrack).CornerRadius = UDim.new(0.5, 0)

local sliderFill = Instance.new("Frame")
sliderFill.Name = "Fill"
sliderFill.Size = UDim2.new(currentRatio, 0, 1, 0)
sliderFill.BackgroundColor3 = Color3.fromRGB(255, 180, 50)
sliderFill.Parent = sliderTrack
Instance.new("UICorner", sliderFill).CornerRadius = UDim.new(0.5, 0)

local sliderKnob = Instance.new("Frame")
sliderKnob.Name = "Knob"
sliderKnob.Size = UDim2.new(0, 20, 0, 20)
sliderKnob.AnchorPoint = Vector2.new(0.5, 0.5)
sliderKnob.Position = UDim2.new(currentRatio, 0, 0.5, 0)
sliderKnob.BackgroundColor3 = Color3.fromRGB(255, 230, 80)
sliderKnob.Parent = sliderTrack
Instance.new("UICorner", sliderKnob).CornerRadius = UDim.new(0.5, 0)

-- ---- プリセットボタン ----
local presetFrame = Instance.new("Frame")
presetFrame.Size = UDim2.new(1, -20, 0, 100)
presetFrame.Position = UDim2.new(0, 10, 0, 180)
presetFrame.BackgroundTransparency = 1
presetFrame.Parent = panel

local listLayout = Instance.new("UIGridLayout")
listLayout.CellSize = UDim2.new(0.5, -4, 0, 44)
listLayout.CellPaddingX = UDim.new(0, 8)
listLayout.CellPaddingY = UDim.new(0, 6)
listLayout.Parent = presetFrame

local PRESET_ORDER = { "GLASS_CANNON", "AGGRESSIVE", "BALANCED", "DEFENSIVE", "FULL_TANK" }

for _, key in ipairs(PRESET_ORDER) do
    local p = LimiterConfig.PRESETS[key]
    local btn = Instance.new("TextButton")
    btn.Name = key
    btn.BackgroundColor3 = Color3.fromRGB(45, 45, 65)
    btn.TextColor3 = Color3.fromRGB(200, 200, 255)
    btn.Font = Enum.Font.GothamBold
    btn.TextSize = 12
    btn.Text = p.label
    btn.Parent = presetFrame
    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 6)

    btn.MouseButton1Click:Connect(function()
        currentRatio = p.ratio
        updateSliderVisual(currentRatio)
        SetLimiterRatio:FireServer(currentRatio)
    end)
end

-- ========== ステータス表示の更新 ==========
function updateStatLabels(ratio)
    local stats = LimiterConfig.calcStats(ratio)
    hpLabel.Text    = "❤ HP: " .. stats.maxHP
    dmgLabel.Text   = "⚔ DMG: x" .. string.format("%.2f", stats.damageMult)
    speedLabel.Text = "💨 SPD: " .. stats.walkSpeed
end

function updateSliderVisual(ratio)
    sliderFill.Size = UDim2.new(ratio, 0, 1, 0)
    sliderKnob.Position = UDim2.new(ratio, 0, 0.5, 0)

    -- 色をグラデーション: 低比率=青, 高比率=赤
    local r = math.floor(80 + 175 * ratio)
    local b = math.floor(255 - 175 * ratio)
    sliderFill.BackgroundColor3 = Color3.fromRGB(r, 120, b)
    sliderKnob.BackgroundColor3 = Color3.fromRGB(r + 30, 140, b + 30)

    updateStatLabels(ratio)
end

updateStatLabels(currentRatio)

-- ========== スライダーのドラッグ操作 ==========
local isDragging = false

sliderTrack.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        isDragging = true
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 and isDragging then
        isDragging = false
        SetLimiterRatio:FireServer(currentRatio)
    end
end)

RunService.RenderStepped:Connect(function()
    if not isDragging then return end
    local mousePos   = UserInputService:GetMouseLocation()
    local trackPos   = sliderTrack.AbsolutePosition
    local trackSize  = sliderTrack.AbsoluteSize
    local ratio      = math.clamp((mousePos.X - trackPos.X) / trackSize.X, 0, 1)
    currentRatio = ratio
    updateSliderVisual(ratio)
end)

-- ========== トグルボタン ==========
toggleBtn.MouseButton1Click:Connect(function()
    isOpen = not isOpen
    panel.Visible = isOpen
    toggleBtn.BackgroundColor3 = isOpen
        and Color3.fromRGB(50, 50, 80)
        or  Color3.fromRGB(30, 30, 40)
end)

-- ========== サーバーからのリミッター変更通知を受け取る ==========
LimiterChanged.OnClientEvent:Connect(function(userId, newRatio, _stats)
    if userId == localPlayer.UserId then
        currentRatio = newRatio
        updateSliderVisual(newRatio)
    end
end)

print("[LimiterUI] クライアント起動完了")
