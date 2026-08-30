-- MainMenuUI.lua (Client)
-- ゲーム起動後の最初の画面
-- カジュアル / ランク戦 を選択してそれぞれのロビーUIを表示する

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

local Remotes           = ReplicatedStorage:WaitForChild("Remotes")
local GetPlayerData     = Remotes:WaitForChild("GetPlayerData")
local PlayerDataUpdated = Remotes:WaitForChild("PlayerDataUpdated")

local localPlayer = Players.LocalPlayer

-- ========================================================
-- ユーティリティ
-- ========================================================
local function tween(obj, t, goals)
    TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Quad), goals):Play()
end

-- ========================================================
-- ScreenGui
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name           = "MainMenuUI"
gui.ResetOnSpawn   = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset = true
gui.Parent         = localPlayer:WaitForChild("PlayerGui")

-- 背景オーバーレイ
local overlay = Instance.new("Frame")
overlay.Size = UDim2.new(1,0,1,0)
overlay.BackgroundColor3 = Color3.fromRGB(6,6,10)
overlay.BackgroundTransparency = 0
overlay.Parent = gui

-- メインパネル
local panel = Instance.new("Frame")
panel.Size     = UDim2.new(0, 420, 0, 500)
panel.Position = UDim2.new(0.5, -210, 0.5, -250)
panel.BackgroundColor3 = Color3.fromRGB(16, 16, 24)
panel.Parent = gui
do
    local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0,18); c.Parent = panel
    local s = Instance.new("UIStroke"); s.Color = Color3.fromRGB(60,60,90); s.Thickness = 1; s.Parent = panel
end

local content = Instance.new("Frame")
content.Size = UDim2.new(1,-40,1,-40)
content.Position = UDim2.new(0,20,0,20)
content.BackgroundTransparency = 1
content.Parent = panel

-- ── タイトル ──
local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1,0,0,48)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "THE LIMITER"
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 32
titleLabel.TextColor3 = Color3.fromRGB(255,220,60)
titleLabel.Parent = content

-- ── プレイヤー情報カード ──
local card = Instance.new("Frame")
card.Size = UDim2.new(1,0,0,74)
card.Position = UDim2.new(0,0,0,56)
card.BackgroundColor3 = Color3.fromRGB(22,22,34)
card.Parent = content
Instance.new("UICorner", card).CornerRadius = UDim.new(0,10)

-- 名前
local nameLabel = Instance.new("TextLabel")
nameLabel.Size = UDim2.new(0.5,0,0,28)
nameLabel.Position = UDim2.new(0,12,0,8)
nameLabel.BackgroundTransparency = 1
nameLabel.Text = localPlayer.Name
nameLabel.Font = Enum.Font.GothamBold
nameLabel.TextSize = 16
nameLabel.TextColor3 = Color3.fromRGB(220,220,255)
nameLabel.TextXAlignment = Enum.TextXAlignment.Left
nameLabel.Parent = card

-- カジュアルレベル (左下)
local levelLabel = Instance.new("TextLabel")
levelLabel.Size = UDim2.new(0.5,0,0,22)
levelLabel.Position = UDim2.new(0,12,0,40)
levelLabel.BackgroundTransparency = 1
levelLabel.Text = "Lv.1  初心者"
levelLabel.Font = Enum.Font.Gotham
levelLabel.TextSize = 12
levelLabel.TextColor3 = Color3.fromRGB(120,200,120)
levelLabel.TextXAlignment = Enum.TextXAlignment.Left
levelLabel.Parent = card

-- ランクバッジ (右)
local rankBadge = Instance.new("Frame")
rankBadge.Size = UDim2.new(0, 110, 0, 54)
rankBadge.Position = UDim2.new(1,-120,0.5,-27)
rankBadge.BackgroundColor3 = Color3.fromRGB(30,15,10)
rankBadge.Parent = card
Instance.new("UICorner", rankBadge).CornerRadius = UDim.new(0,8)

local rankTierLabel = Instance.new("TextLabel")
rankTierLabel.Size = UDim2.new(1,0,0,22)
rankTierLabel.Position = UDim2.new(0,0,0,4)
rankTierLabel.BackgroundTransparency = 1
rankTierLabel.Text = "ブロンズ"
rankTierLabel.Font = Enum.Font.GothamBold
rankTierLabel.TextSize = 13
rankTierLabel.TextColor3 = Color3.fromRGB(180,100,50)
rankTierLabel.Parent = rankBadge

local rankValueLabel = Instance.new("TextLabel")
rankValueLabel.Size = UDim2.new(1,0,0,20)
rankValueLabel.Position = UDim2.new(0,0,0,28)
rankValueLabel.BackgroundTransparency = 1
rankValueLabel.Text = "1000 RP"
rankValueLabel.Font = Enum.Font.Gotham
rankValueLabel.TextSize = 11
rankValueLabel.TextColor3 = Color3.fromRGB(160,160,180)
rankValueLabel.Parent = rankBadge

-- 区切り線
local div = Instance.new("Frame")
div.Size = UDim2.new(1,0,0,1)
div.Position = UDim2.new(0,0,0,140)
div.BackgroundColor3 = Color3.fromRGB(50,50,70)
div.Parent = content

-- ── モード選択ラベル ──
local chooseLabel = Instance.new("TextLabel")
chooseLabel.Size = UDim2.new(1,0,0,20)
chooseLabel.Position = UDim2.new(0,0,0,148)
chooseLabel.BackgroundTransparency = 1
chooseLabel.Text = "プレイするモードを選択"
chooseLabel.Font = Enum.Font.Gotham
chooseLabel.TextSize = 12
chooseLabel.TextColor3 = Color3.fromRGB(110,110,150)
chooseLabel.Parent = content

-- ── カジュアルボタン ──
local casualBtn = Instance.new("TextButton")
casualBtn.Size = UDim2.new(1,0,0,104)
casualBtn.Position = UDim2.new(0,0,0,174)
casualBtn.BackgroundColor3 = Color3.fromRGB(22,38,28)
casualBtn.Parent = content
Instance.new("UICorner", casualBtn).CornerRadius = UDim.new(0,12)
local casualStroke = Instance.new("UIStroke")
casualStroke.Color = Color3.fromRGB(60,140,80)
casualStroke.Thickness = 1.5
casualStroke.Parent = casualBtn

local casualIconL = Instance.new("TextLabel")
casualIconL.Size = UDim2.new(0,50,1,0)
casualIconL.BackgroundTransparency = 1
casualIconL.Text = "🎮"
casualIconL.Font = Enum.Font.GothamBold
casualIconL.TextSize = 32
casualIconL.TextColor3 = Color3.fromRGB(255,255,255)
casualIconL.Parent = casualBtn

local casualTitleL = Instance.new("TextLabel")
casualTitleL.Size = UDim2.new(1,-60,0,32)
casualTitleL.Position = UDim2.new(0,56,0,16)
casualTitleL.BackgroundTransparency = 1
casualTitleL.Text = "カジュアル"
casualTitleL.Font = Enum.Font.GothamBold
casualTitleL.TextSize = 20
casualTitleL.TextColor3 = Color3.fromRGB(100,230,120)
casualTitleL.TextXAlignment = Enum.TextXAlignment.Left
casualTitleL.Parent = casualBtn

local casualDescL = Instance.new("TextLabel")
casualDescL.Size = UDim2.new(1,-60,0,40)
casualDescL.Position = UDim2.new(0,56,0,50)
casualDescL.BackgroundTransparency = 1
casualDescL.Text = "レベルの近いプレイヤーとチーム戦・個人戦\nランクは変動しない"
casualDescL.Font = Enum.Font.Gotham
casualDescL.TextSize = 11
casualDescL.TextColor3 = Color3.fromRGB(140,180,150)
casualDescL.TextXAlignment = Enum.TextXAlignment.Left
casualDescL.TextWrapped = true
casualDescL.Parent = casualBtn

-- ── ランク戦ボタン ──
local rankedBtn = Instance.new("TextButton")
rankedBtn.Size = UDim2.new(1,0,0,104)
rankedBtn.Position = UDim2.new(0,0,0,288)
rankedBtn.BackgroundColor3 = Color3.fromRGB(36,20,12)
rankedBtn.Parent = content
Instance.new("UICorner", rankedBtn).CornerRadius = UDim.new(0,12)
local rankedStroke = Instance.new("UIStroke")
rankedStroke.Color = Color3.fromRGB(200,130,50)
rankedStroke.Thickness = 1.5
rankedStroke.Parent = rankedBtn

local rankedIconL = Instance.new("TextLabel")
rankedIconL.Size = UDim2.new(0,50,1,0)
rankedIconL.BackgroundTransparency = 1
rankedIconL.Text = "🏆"
rankedIconL.Font = Enum.Font.GothamBold
rankedIconL.TextSize = 32
rankedIconL.TextColor3 = Color3.fromRGB(255,255,255)
rankedIconL.Parent = rankedBtn

local rankedTitleL = Instance.new("TextLabel")
rankedTitleL.Size = UDim2.new(1,-60,0,32)
rankedTitleL.Position = UDim2.new(0,56,0,16)
rankedTitleL.BackgroundTransparency = 1
rankedTitleL.Text = "ランク戦"
rankedTitleL.Font = Enum.Font.GothamBold
rankedTitleL.TextSize = 20
rankedTitleL.TextColor3 = Color3.fromRGB(255,200,80)
rankedTitleL.TextXAlignment = Enum.TextXAlignment.Left
rankedTitleL.Parent = rankedBtn

local rankedDescL = Instance.new("TextLabel")
rankedDescL.Size = UDim2.new(1,-60,0,40)
rankedDescL.Position = UDim2.new(0,56,0,50)
rankedDescL.BackgroundTransparency = 1
rankedDescL.Text = "ランク値が近いプレイヤーとマッチング\n勝敗でランクポイントが変動"
rankedDescL.Font = Enum.Font.Gotham
rankedDescL.TextSize = 11
rankedDescL.TextColor3 = Color3.fromRGB(190,160,110)
rankedDescL.TextXAlignment = Enum.TextXAlignment.Left
rankedDescL.TextWrapped = true
rankedDescL.Parent = rankedBtn

-- オンライン人数
local onlineLabel = Instance.new("TextLabel")
onlineLabel.Size = UDim2.new(1,0,0,18)
onlineLabel.Position = UDim2.new(0,0,0,406)
onlineLabel.BackgroundTransparency = 1
onlineLabel.Text = "オンライン: -- 人"
onlineLabel.Font = Enum.Font.Gotham
onlineLabel.TextSize = 10
onlineLabel.TextColor3 = Color3.fromRGB(90,90,110)
onlineLabel.Parent = content

-- ========================================================
-- プレイヤーデータ表示の更新
-- ========================================================
local function updateStats(data)
    if not data then return end

    levelLabel.Text = string.format("Lv.%d  %s", data.level, data.bracketLabel)

    local tier = PlayerData.getTier(data.rankValue)
    rankTierLabel.Text  = tier.name
    rankTierLabel.TextColor3 = Color3.fromRGB(tier.r, tier.g, tier.b)
    rankValueLabel.Text = data.rankValue .. " RP"
    rankBadge.BackgroundColor3 = Color3.fromRGB(
        math.floor(tier.r * 0.15), math.floor(tier.g * 0.15), math.floor(tier.b * 0.15)
    )
end

-- 初回データ取得
task.spawn(function()
    local ok, data = pcall(function() return GetPlayerData:InvokeServer() end)
    if ok and data then updateStats(data) end
end)

PlayerDataUpdated.OnClientEvent:Connect(updateStats)

-- ========================================================
-- ボタン操作: 他のUIを開く/閉じる
-- ========================================================
-- 他のUIスクリプト (MatchmakingUI, RankedUI) を取得する
-- PlayerGui は子スクリプトが ScreenGui を作るので WaitForChild で待機
local function hideMainMenu()
    tween(panel, 0.2, { Position = UDim2.new(0.5,-210,0.5,-300) })
    tween(overlay, 0.3, { BackgroundTransparency = 1 })
    task.delay(0.3, function() gui.Enabled = false end)
end

local function showMainMenu()
    gui.Enabled = true
    overlay.BackgroundTransparency = 1
    panel.Position = UDim2.new(0.5,-210,0.5,-300)
    tween(overlay, 0.3, { BackgroundTransparency = 0 })
    tween(panel, 0.25, { Position = UDim2.new(0.5,-210,0.5,-250) })

    -- プレイヤーデータを再取得
    task.spawn(function()
        local ok, data = pcall(function() return GetPlayerData:InvokeServer() end)
        if ok and data then updateStats(data) end
    end)
end

-- 外部から呼び出し可能な公開 API
local MainMenuUI = {}
MainMenuUI.show = showMainMenu
MainMenuUI.hide = hideMainMenu

-- カジュアルボタン
casualBtn.MouseButton1Click:Connect(function()
    hideMainMenu()
    -- CasualLobbyUI (MatchmakingUI) を表示
    local casualGui = localPlayer:WaitForChild("PlayerGui"):WaitForChild("MatchmakingUI", 5)
    if casualGui then
        casualGui.Enabled = true
    end
end)

-- ランク戦ボタン
rankedBtn.MouseButton1Click:Connect(function()
    hideMainMenu()
    -- RankedUI を表示
    local rankedGui = localPlayer:WaitForChild("PlayerGui"):WaitForChild("RankedUI", 5)
    if rankedGui then
        rankedGui.Enabled = true
    end
end)

-- オンライン人数更新
local MM_StateUpdate = Remotes:WaitForChild("MM_StateUpdate")
MM_StateUpdate.OnClientEvent:Connect(function(ph, data)
    if ph == "LOBBY" and data and data.onlineCount then
        onlineLabel.Text = "オンライン: " .. data.onlineCount .. " 人"
    end
end)

-- 試合終了後にメインメニューへ戻る
local RoundEvent = Remotes:WaitForChild("RoundEvent")
RoundEvent.OnClientEvent:Connect(function(eventType)
    if eventType == "MATCH_WIN" or eventType == "MATCH_LOSE" then
        task.delay(6, showMainMenu)
    end
end)

-- 初期表示
showMainMenu()

print("[MainMenuUI] 起動完了")

return MainMenuUI
