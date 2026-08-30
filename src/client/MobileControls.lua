-- MobileControls.lua (Client)
-- モバイル向けジャンプボタン (右下)
-- PC / コンソールでは自動的に非表示

local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")

local localPlayer = Players.LocalPlayer

-- タッチデバイスでなければ何もしない
if not UserInputService.TouchEnabled then
    return
end

-- ========================================================
-- ScreenGui
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name            = "MobileControls"
gui.ResetOnSpawn    = false
gui.ZIndexBehavior  = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset  = true
gui.Parent          = localPlayer:WaitForChild("PlayerGui")

-- ========================================================
-- ジャンプボタン (右下)
-- ========================================================
local JUMP_SIZE = 80

local jumpBtn = Instance.new("ImageButton")
jumpBtn.Name = "JumpButton"
jumpBtn.Size = UDim2.new(0, JUMP_SIZE, 0, JUMP_SIZE)
jumpBtn.Position = UDim2.new(1, -(JUMP_SIZE + 20), 1, -(JUMP_SIZE + 20))
jumpBtn.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
jumpBtn.BackgroundTransparency = 0.3
jumpBtn.Image = ""   -- アイコンがあればAssetIdをここに入れる
jumpBtn.Parent = gui
do
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0.5, 0)  -- 完全な円
    c.Parent = jumpBtn
    local s = Instance.new("UIStroke")
    s.Color = Color3.fromRGB(80, 80, 120)
    s.Thickness = 2
    s.Parent = jumpBtn
end

-- ジャンプアイコン (↑ テキストで代用)
local jumpIcon = Instance.new("TextLabel")
jumpIcon.Size = UDim2.new(1, 0, 1, 0)
jumpIcon.BackgroundTransparency = 1
jumpIcon.Text = "JUMP"
jumpIcon.Font = Enum.Font.GothamBold
jumpIcon.TextSize = 14
jumpIcon.TextColor3 = Color3.fromRGB(200, 200, 255)
jumpIcon.Parent = jumpBtn

-- ========================================================
-- ジャンプ処理
-- ========================================================
local function doJump(state)
    local character = localPlayer.Character
    if not character then return end
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    if state == Enum.UserInputState.Begin then
        humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
        -- ボタンの見た目変化
        jumpBtn.BackgroundTransparency = 0.05
        jumpIcon.TextColor3 = Color3.fromRGB(255, 220, 60)
    elseif state == Enum.UserInputState.End then
        jumpBtn.BackgroundTransparency = 0.3
        jumpIcon.TextColor3 = Color3.fromRGB(200, 200, 255)
    end
end

ContextActionService:BindAction("MobileJump", doJump, false,
    Enum.UserInputType.Touch)

jumpBtn.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.Touch then
        doJump(Enum.UserInputState.Begin)
    end
end)
jumpBtn.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.Touch then
        doJump(Enum.UserInputState.End)
    end
end)

-- キャラクター切り替え対応
localPlayer.CharacterAdded:Connect(function() end)

print("[MobileControls] ジャンプボタン表示")
