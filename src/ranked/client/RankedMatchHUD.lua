-- ranked/client/RankedMatchHUD.lua
-- ランク戦プレース専用HUD
-- テレポートデータを読んでチーム情報を表示、試合後にRP変動を表示

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TeleportService   = game:GetService("TweenService") -- ※Tweenはローカル用
local TweenService      = game:GetService("TweenService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

local Remotes         = ReplicatedStorage:WaitForChild("Remotes")
local RankedMatch_Update = Remotes:WaitForChild("RankedMatch_Update")
local RoundEvent      = Remotes:WaitForChild("RoundEvent")
local TimerUpdate     = Remotes:WaitForChild("TimerUpdate")
local KillFeed        = Remotes:WaitForChild("KillFeed")
local LimiterChanged  = Remotes:WaitForChild("LimiterChanged")
local GetLimiterRatio = Remotes:WaitForChild("GetLimiterRatio")
local LimiterConfig   = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("LimiterConfig"))

local localPlayer = Players.LocalPlayer

-- ========================================================
-- テレポートデータを読む (チーム情報など)
-- ========================================================
local myTeam    = "?"
local myMode    = "?"
local myRankValue = PlayerData.DEFAULT_RANK_VALUE

-- クライアント側でもテレポートデータを取得できる
local function readTeleportData()
    local ok, data = pcall(function()
        return game:GetService("TeleportService"):GetLocalPlayerTeleportData()
    end)
    if ok and data then
        myMode      = data.mode or "?"
        -- チームは RankedMatchService → RankedMatch_Update で受け取る
    end
end

task.spawn(readTeleportData)

-- ========================================================
-- ScreenGui
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name           = "RankedMatchHUD"
gui.ResetOnSpawn   = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset = true
gui.Enabled        = true
gui.Parent         = localPlayer:WaitForChild("PlayerGui")

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0,r or 8); c.Parent = p end
local function tween(o, t, g) TweenService:Create(o, TweenInfo.new(t, Enum.EasingStyle.Quad), g):Play() end

-- ========================================================
-- トップバー
-- ========================================================
local TOP_H = 44
local topBar = Instance.new("Frame")
topBar.Size = UDim2.new(1,0,0,TOP_H)
topBar.BackgroundColor3 = Color3.fromRGB(10,8,18)
topBar.BackgroundTransparency = 0.1
topBar.Parent = gui

-- ランクバッジ (左)
local rankBadge = Instance.new("Frame")
rankBadge.Size = UDim2.new(0,130,0,TOP_H-6)
rankBadge.Position = UDim2.new(0,6,0,3)
rankBadge.BackgroundColor3 = Color3.fromRGB(30,20,8)
rankBadge.Parent = topBar; corner(rankBadge, 6)

local rankLabel = Instance.new("TextLabel")
rankLabel.Size = UDim2.new(1,0,1,0)
rankLabel.BackgroundTransparency = 1
rankLabel.Text = "ブロンズ  1000 RP"
rankLabel.Font = Enum.Font.GothamBold
rankLabel.TextSize = 12
rankLabel.TextColor3 = Color3.fromRGB(180,100,50)
rankLabel.Parent = rankBadge

-- チームバッジ (左端寄り)
local teamBadge = Instance.new("Frame")
teamBadge.Size = UDim2.new(0,80,0,TOP_H-6)
teamBadge.Position = UDim2.new(0,142,0,3)
teamBadge.BackgroundColor3 = Color3.fromRGB(20,20,40)
teamBadge.Parent = topBar; corner(teamBadge, 6)

local teamLabel = Instance.new("TextLabel")
teamLabel.Size = UDim2.new(1,0,1,0)
teamLabel.BackgroundTransparency = 1
teamLabel.Text = "チーム ?"
teamLabel.Font = Enum.Font.GothamBold
teamLabel.TextSize = 12
teamLabel.TextColor3 = Color3.fromRGB(180,180,255)
teamLabel.Parent = teamBadge

-- タイマー (中央)
local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0,100,1,0)
timerLabel.Position = UDim2.new(0.5,-50,0,0)
timerLabel.BackgroundTransparency = 1
timerLabel.Text = "--:--"
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextSize = 22
timerLabel.TextColor3 = Color3.fromRGB(255,255,255)
timerLabel.Parent = topBar

-- ラウンド表示 (タイマー上)
local roundLabel = Instance.new("TextLabel")
roundLabel.Size = UDim2.new(0,140,0,14)
roundLabel.Position = UDim2.new(0.5,-70,0,2)
roundLabel.BackgroundTransparency = 1
roundLabel.Text = "RANKED  MATCH"
roundLabel.Font = Enum.Font.GothamBold
roundLabel.TextSize = 9
roundLabel.TextColor3 = Color3.fromRGB(255,180,50)
roundLabel.Parent = topBar

-- リミッタースライダー (右)
local limSection = Instance.new("Frame")
limSection.Size = UDim2.new(0,200,1,0)
limSection.Position = UDim2.new(1,-206,0,0)
limSection.BackgroundTransparency = 1
limSection.Parent = topBar

local limLabel = Instance.new("TextLabel")
limLabel.Size = UDim2.new(0,50,0,14)
limLabel.Position = UDim2.new(0,4,0,2)
limLabel.BackgroundTransparency = 1
limLabel.Text = "LIMITER"
limLabel.Font = Enum.Font.GothamBold; limLabel.TextSize = 9
limLabel.TextColor3 = Color3.fromRGB(255,220,60)
limLabel.Parent = limSection

local lTrack = Instance.new("Frame")
lTrack.Size = UDim2.new(1,-50,0,8)
lTrack.Position = UDim2.new(0,20,0.5,-4)
lTrack.BackgroundColor3 = Color3.fromRGB(40,40,60)
lTrack.Parent = limSection; corner(lTrack, 4)

local lFill = Instance.new("Frame")
lFill.Size = UDim2.new(0.5,0,1,0)
lFill.BackgroundColor3 = Color3.fromRGB(180,180,255)
lFill.Parent = lTrack; corner(lFill, 4)

local lKnob = Instance.new("Frame")
lKnob.Size = UDim2.new(0,14,0,14)
lKnob.AnchorPoint = Vector2.new(0.5,0.5)
lKnob.Position = UDim2.new(0.5,0,0.5,0)
lKnob.BackgroundColor3 = Color3.fromRGB(255,230,80)
lKnob.Parent = lTrack; corner(lKnob, 7)

local lRatioText = Instance.new("TextLabel")
lRatioText.Size = UDim2.new(1,-50,0,12)
lRatioText.Position = UDim2.new(0,20,1,-12)
lRatioText.BackgroundTransparency = 1
lRatioText.Text = "ATK 50% / HP 50%"
lRatioText.Font = Enum.Font.Gotham; lRatioText.TextSize = 8
lRatioText.TextColor3 = Color3.fromRGB(120,120,160)
lRatioText.Parent = limSection

-- ========================================================
-- 中央バナー (全滅通知 / ラウンド開始 / 試合結果)
-- ========================================================
local banner = Instance.new("Frame")
banner.Size = UDim2.new(0,480,0,90)
banner.Position = UDim2.new(0.5,-240,0,-100)
banner.BackgroundColor3 = Color3.fromRGB(12,12,20)
banner.BackgroundTransparency = 0.1
banner.Parent = gui; corner(banner, 14)

local bannerSub  = Instance.new("TextLabel")
bannerSub.Size = UDim2.new(1,0,0,26); bannerSub.BackgroundTransparency=1
bannerSub.Font=Enum.Font.GothamBold; bannerSub.TextSize=13
bannerSub.TextColor3=Color3.fromRGB(160,160,220); bannerSub.Parent=banner

local bannerMain = Instance.new("TextLabel")
bannerMain.Size = UDim2.new(1,0,0,58); bannerMain.Position=UDim2.new(0,0,0,28)
bannerMain.BackgroundTransparency=1; bannerMain.Font=Enum.Font.GothamBold
bannerMain.TextSize=44; bannerMain.TextColor3=Color3.fromRGB(255,255,255); bannerMain.Parent=banner

local function showBanner(sub, main, color, duration)
    bannerSub.Text = sub; bannerMain.Text = main
    bannerMain.TextColor3 = color or Color3.fromRGB(255,255,255)
    banner.Position = UDim2.new(0.5,-240,0,-100)
    tween(banner, 0.4, { Position = UDim2.new(0.5,-240,0,TOP_H+20) })
    task.delay(duration or 3.0, function()
        tween(banner, 0.4, { Position = UDim2.new(0.5,-240,0,-100) })
    end)
end

-- ========================================================
-- RP変動オーバーレイ
-- ========================================================
local rpOverlay = Instance.new("Frame")
rpOverlay.Size = UDim2.new(1,0,1,0)
rpOverlay.BackgroundColor3 = Color3.fromRGB(0,0,0)
rpOverlay.BackgroundTransparency = 1
rpOverlay.Visible = false
rpOverlay.Parent = gui

local rpMainLabel = Instance.new("TextLabel")
rpMainLabel.Size = UDim2.new(0,300,0,60)
rpMainLabel.Position = UDim2.new(0.5,-150,0.4,-30)
rpMainLabel.BackgroundTransparency = 1
rpMainLabel.Text = "+25 RP"
rpMainLabel.Font = Enum.Font.GothamBold; rpMainLabel.TextSize = 52
rpMainLabel.TextColor3 = Color3.fromRGB(80,255,80)
rpMainLabel.Parent = rpOverlay

local rpSubLabel = Instance.new("TextLabel")
rpSubLabel.Size = UDim2.new(0,300,0,30)
rpSubLabel.Position = UDim2.new(0.5,-150,0.4,34)
rpSubLabel.BackgroundTransparency = 1
rpSubLabel.Text = "1000 → 1025 RP"
rpSubLabel.Font = Enum.Font.Gotham; rpSubLabel.TextSize = 18
rpSubLabel.TextColor3 = Color3.fromRGB(180,255,180)
rpSubLabel.Parent = rpOverlay

local rpReturnLabel = Instance.new("TextLabel")
rpReturnLabel.Size = UDim2.new(0,300,0,22)
rpReturnLabel.Position = UDim2.new(0.5,-150,0.4,70)
rpReturnLabel.BackgroundTransparency = 1
rpReturnLabel.Text = "ロビーへ移動中..."
rpReturnLabel.Font = Enum.Font.Gotham; rpReturnLabel.TextSize = 13
rpReturnLabel.TextColor3 = Color3.fromRGB(140,140,180)
rpReturnLabel.Parent = rpOverlay

-- ========================================================
-- リミッター表示更新
-- ========================================================
local function updateLimiterVisual(ratio)
    local r = math.floor(80 + 175 * ratio)
    local b = math.floor(255 - 175 * ratio)
    local col = Color3.fromRGB(r, 120, b)
    tween(lFill, 0.25, { Size=UDim2.new(ratio,0,1,0), BackgroundColor3=col })
    tween(lKnob, 0.25, { Position=UDim2.new(ratio,0,0.5,0), BackgroundColor3=col })
    lRatioText.Text = "ATK " .. math.floor(ratio*100) .. "% / HP " .. (100-math.floor(ratio*100)) .. "%"
end

local currentRatio = 0.5
task.spawn(function()
    local ok, rv = pcall(function() return GetLimiterRatio:InvokeServer() end)
    if ok and rv then currentRatio = rv; updateLimiterVisual(rv) end
end)

LimiterChanged.OnClientEvent:Connect(function(userId, newRatio)
    if userId == localPlayer.UserId then
        currentRatio = newRatio; updateLimiterVisual(newRatio)
    end
end)

-- ========================================================
-- イベント受信
-- ========================================================
TimerUpdate.OnClientEvent:Connect(function(sec)
    local m = math.floor(sec/60); local s = sec%60
    timerLabel.Text = string.format("%d:%02d", m, s)
    timerLabel.TextColor3 = sec <= 10 and Color3.fromRGB(255,80,80) or Color3.fromRGB(255,255,255)
end)

RoundEvent.OnClientEvent:Connect(function(eventType, data)
    if eventType == "ROUND_START" then
        roundLabel.Text = "ROUND " .. (data.round or 1) .. " / " .. (data.maxRounds or 3)
        showBanner("RANKED MATCH", "FIGHT!", Color3.fromRGB(255,180,50), 2.0)
    elseif eventType == "ROUND_END" then
        showBanner((data.winnerLabel or "?") .. " 勝利", "ROUND END", Color3.fromRGB(180,180,255), 3.0)
    elseif eventType == "TEAM_ELIMINATED" then
        showBanner(data.teamLabel .. " 全滅", "ELIMINATED", Color3.fromRGB(255,80,80), 2.5)
    elseif eventType == "COUNTDOWN" then
        showBanner("", tostring(data.count or ""), Color3.fromRGB(255,255,255), 0.8)
    end
end)

RankedMatch_Update.OnClientEvent:Connect(function(eventType, data)
    if eventType == "MATCH_READY" then
        myMode = data.mode or "?"
        myTeam = data.teamAssignment or "?"
        local teamColors = { A=Color3.fromRGB(80,150,255), B=Color3.fromRGB(255,80,80), C=Color3.fromRGB(80,220,100) }
        teamLabel.Text = "チーム " .. myTeam
        teamLabel.TextColor3 = teamColors[myTeam] or Color3.fromRGB(200,200,255)

    elseif eventType == "RANK_RESULT" then
        -- RP変動を表示してからロビーへ
        local rp    = data.rpChange or 0
        local newRv = data.newRankValue or myRankValue
        local tier  = PlayerData.getTier(newRv)

        rpOverlay.Visible = true
        tween(rpOverlay, 0.5, { BackgroundTransparency = 0.3 })

        rpMainLabel.Text = (rp >= 0 and "+" or "") .. rp .. " RP"
        rpMainLabel.TextColor3 = rp >= 0 and Color3.fromRGB(80,255,80) or Color3.fromRGB(255,80,80)
        rpSubLabel.Text = myRankValue .. " → " .. newRv .. " RP  (" .. tier.name .. ")"
        myRankValue = newRv

        rankLabel.Text = tier.name .. "  " .. newRv .. " RP"
        rankLabel.TextColor3 = Color3.fromRGB(tier.r, tier.g, tier.b)
    end
end)

print("[RankedMatchHUD] 起動完了")
