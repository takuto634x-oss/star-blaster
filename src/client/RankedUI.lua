-- RankedUI.lua (Client)
-- ランク戦ロビー画面
-- ランク値が近いプレイヤーとマッチングする
-- Remote prefix: Ranked_

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")
local RunService        = game:GetService("RunService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

local Remotes            = ReplicatedStorage:WaitForChild("Remotes")
local Ranked_Join        = Remotes:WaitForChild("Ranked_Join")
local Ranked_Leave       = Remotes:WaitForChild("Ranked_Leave")
local Ranked_Accept      = Remotes:WaitForChild("Ranked_Accept")
local Ranked_StateUpdate = Remotes:WaitForChild("Ranked_StateUpdate")
local GetPlayerData      = Remotes:WaitForChild("GetPlayerData")
local PlayerDataUpdated  = Remotes:WaitForChild("PlayerDataUpdated")

local localPlayer = Players.LocalPlayer
local phase = "LOBBY"
local currentRankValue = PlayerData.DEFAULT_RANK_VALUE

-- ========================================================
-- モード定義 (表示用)
-- ========================================================
local SECTIONS = {
    {
        header = "2チーム対戦",
        cols   = 2,
        modes  = {
            { key="1v1",  label="1 v 1",  sub="2人",  icon="⚔",   needed=2,  maxSlots=2  },
            { key="2v2",  label="2 v 2",  sub="4人",  icon="🛡",   needed=4,  maxSlots=4  },
            { key="3v3",  label="3 v 3",  sub="6人",  icon="⚔⚔",  needed=6,  maxSlots=6  },
            { key="5v5",  label="5 v 5",  sub="10人", icon="🛡🛡",  needed=10, maxSlots=10 },
        },
    },
    {
        header = "3チーム対戦",
        cols   = 3,
        modes  = {
            { key="1v1v1", label="1v1v1", sub="3人", icon="💥",    needed=3, maxSlots=3 },
            { key="2v2v2", label="2v2v2", sub="6人", icon="💥💥",  needed=6, maxSlots=6 },
            { key="3v3v3", label="3v3v3", sub="9人", icon="💥💥💥",needed=9, maxSlots=9 },
        },
    },
}

local ALL_MODES = {}
for _, sec in ipairs(SECTIONS) do for _, md in ipairs(sec.modes) do table.insert(ALL_MODES, md) end end

local selectedModeIdx = 1
local modeButtons = {}

local function selectedMode() return ALL_MODES[selectedModeIdx] end

-- ========================================================
-- ユーティリティ
-- ========================================================
local function tween(obj, t, goals)
    TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Quad), goals):Play()
end

-- ========================================================
-- ScreenGui (デフォルト非表示: MainMenuUI から開く)
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name           = "RankedUI"
gui.ResetOnSpawn   = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset = true
gui.Enabled        = false   -- MainMenuUI が開く
gui.Parent         = localPlayer:WaitForChild("PlayerGui")

local overlay = Instance.new("Frame")
overlay.Size = UDim2.new(1,0,1,0)
overlay.BackgroundColor3 = Color3.fromRGB(8,8,12)
overlay.BackgroundTransparency = 0.2
overlay.Parent = gui

local PANEL_W = 400
local panel = Instance.new("Frame")
panel.Size     = UDim2.new(0,PANEL_W,0,10)  -- 高さは後で設定
panel.Position = UDim2.new(0.5,-PANEL_W/2,0.5,-5)
panel.BackgroundColor3 = Color3.fromRGB(16,16,24)
panel.Parent = gui
do
    local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0,16); c.Parent = panel
    local s = Instance.new("UIStroke"); s.Color = Color3.fromRGB(80,50,20); s.Thickness = 1.5; s.Parent = panel
end

local INNER_W = PANEL_W - 40
local content = Instance.new("Frame")
content.Size = UDim2.new(1,-40,1,-40)
content.Position = UDim2.new(0,20,0,20)
content.BackgroundTransparency = 1
content.Parent = panel

-- ========================================================
-- ヘッダー
-- ========================================================
local Y = 0

-- 戻るボタン
local backBtn = Instance.new("TextButton")
backBtn.Size = UDim2.new(0,30,0,30)
backBtn.Position = UDim2.new(0,-2,0,Y)
backBtn.BackgroundColor3 = Color3.fromRGB(30,20,10)
backBtn.Font = Enum.Font.GothamBold
backBtn.TextSize = 14
backBtn.TextColor3 = Color3.fromRGB(180,140,80)
backBtn.Text = "←"
backBtn.Parent = content
Instance.new("UICorner", backBtn).CornerRadius = UDim.new(0,6)

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1,-36,0,30)
titleLabel.Position = UDim2.new(0,36,0,Y)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "🏆  ランク戦"
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 22
titleLabel.TextColor3 = Color3.fromRGB(255,200,60)
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = content
Y += 30 + 8

-- ランクカード
local rankCard = Instance.new("Frame")
rankCard.Size = UDim2.new(1,0,0,56)
rankCard.Position = UDim2.new(0,0,0,Y)
rankCard.BackgroundColor3 = Color3.fromRGB(30,18,8)
rankCard.Parent = content
Instance.new("UICorner", rankCard).CornerRadius = UDim.new(0,10)
local rankCardStroke = Instance.new("UIStroke")
rankCardStroke.Color = Color3.fromRGB(180,100,50)
rankCardStroke.Thickness = 1
rankCardStroke.Parent = rankCard

local rankTierLabel = Instance.new("TextLabel")
rankTierLabel.Size = UDim2.new(0.4,0,0,24)
rankTierLabel.Position = UDim2.new(0,12,0,6)
rankTierLabel.BackgroundTransparency = 1
rankTierLabel.Text = "ブロンズ"
rankTierLabel.Font = Enum.Font.GothamBold
rankTierLabel.TextSize = 16
rankTierLabel.TextColor3 = Color3.fromRGB(180,100,50)
rankTierLabel.TextXAlignment = Enum.TextXAlignment.Left
rankTierLabel.Parent = rankCard

local rankValueLabel = Instance.new("TextLabel")
rankValueLabel.Size = UDim2.new(0.4,0,0,20)
rankValueLabel.Position = UDim2.new(0,12,0,30)
rankValueLabel.BackgroundTransparency = 1
rankValueLabel.Text = "1000 RP"
rankValueLabel.Font = Enum.Font.Gotham
rankValueLabel.TextSize = 12
rankValueLabel.TextColor3 = Color3.fromRGB(150,150,180)
rankValueLabel.TextXAlignment = Enum.TextXAlignment.Left
rankValueLabel.Parent = rankCard

-- 検索範囲バー
local rangeBarBG = Instance.new("Frame")
rangeBarBG.Size = UDim2.new(0.52,-8,0,10)
rangeBarBG.Position = UDim2.new(0.48,4,0,16)
rangeBarBG.BackgroundColor3 = Color3.fromRGB(30,30,45)
rangeBarBG.Parent = rankCard
Instance.new("UICorner", rangeBarBG).CornerRadius = UDim.new(0.5,0)

local rangeBarFill = Instance.new("Frame")
rangeBarFill.Size = UDim2.new(0,0,1,0)
rangeBarFill.BackgroundColor3 = Color3.fromRGB(255,180,50)
rangeBarFill.Parent = rangeBarBG
Instance.new("UICorner", rangeBarFill).CornerRadius = UDim.new(0.5,0)

local rangeLabel = Instance.new("TextLabel")
rangeLabel.Size = UDim2.new(0.52,-8,0,16)
rangeLabel.Position = UDim2.new(0.48,4,0,32)
rangeLabel.BackgroundTransparency = 1
rangeLabel.Text = "検索範囲: ±150 RP"
rangeLabel.Font = Enum.Font.Gotham
rangeLabel.TextSize = 9
rangeLabel.TextColor3 = Color3.fromRGB(120,120,150)
rangeLabel.TextXAlignment = Enum.TextXAlignment.Left
rangeLabel.Parent = rankCard

Y += 56 + 8

local function makeDivider(posY)
    local d = Instance.new("Frame")
    d.Size = UDim2.new(1,0,0,1)
    d.Position = UDim2.new(0,0,0,posY)
    d.BackgroundColor3 = Color3.fromRGB(55,40,20)
    d.Parent = content
end
makeDivider(Y); Y += 8

-- ========================================================
-- モード選択 (カジュアルと同じ構造)
-- ========================================================
local BTN_H, BTN_GAP = 64, 6

for _, section in ipairs(SECTIONS) do
    local hdr = Instance.new("TextLabel")
    hdr.Size = UDim2.new(1,0,0,18)
    hdr.Position = UDim2.new(0,0,0,Y)
    hdr.BackgroundTransparency = 1
    hdr.Text = "─  " .. section.header .. "  ─"
    hdr.Font = Enum.Font.GothamBold
    hdr.TextSize = 10
    hdr.TextColor3 = Color3.fromRGB(110,85,50)
    hdr.Parent = content
    Y += 20

    local cols = section.cols
    local btnW = math.floor((INNER_W - BTN_GAP * (cols-1)) / cols)
    local rows = math.ceil(#section.modes / cols)

    for i, modeData in ipairs(section.modes) do
        local col = (i-1) % cols
        local row = math.floor((i-1) / cols)
        local bx  = col * (btnW + BTN_GAP)
        local by  = Y + row * (BTN_H + BTN_GAP)

        local btn = Instance.new("TextButton")
        btn.Name = modeData.key
        btn.Size = UDim2.new(0,btnW,0,BTN_H)
        btn.Position = UDim2.new(0,bx,0,by)
        btn.BackgroundColor3 = Color3.fromRGB(26,16,8)
        btn.Parent = content
        Instance.new("UICorner", btn).CornerRadius = UDim.new(0,8)
        local stroke = Instance.new("UIStroke")
        stroke.Color = Color3.fromRGB(40,30,15)
        stroke.Thickness = 1
        stroke.Parent = btn

        local iconL = Instance.new("TextLabel")
        iconL.Size = UDim2.new(0,32,1,0); iconL.Position = UDim2.new(0,6,0,0)
        iconL.BackgroundTransparency = 1; iconL.Text = modeData.icon
        iconL.Font = Enum.Font.GothamBold; iconL.TextSize = 18
        iconL.TextColor3 = Color3.fromRGB(220,220,255); iconL.Parent = btn

        local nameL = Instance.new("TextLabel")
        nameL.Size = UDim2.new(1,-42,0,24); nameL.Position = UDim2.new(0,40,0,8)
        nameL.BackgroundTransparency = 1; nameL.Text = modeData.label
        nameL.Font = Enum.Font.GothamBold; nameL.TextSize = 13
        nameL.TextColor3 = Color3.fromRGB(220,200,160)
        nameL.TextXAlignment = Enum.TextXAlignment.Left; nameL.Parent = btn

        local subL = Instance.new("TextLabel")
        subL.Size = UDim2.new(1,-42,0,16); subL.Position = UDim2.new(0,40,0,34)
        subL.BackgroundTransparency = 1; subL.Text = modeData.sub
        subL.Font = Enum.Font.Gotham; subL.TextSize = 10
        subL.TextColor3 = Color3.fromRGB(120,100,70)
        subL.TextXAlignment = Enum.TextXAlignment.Left; subL.Parent = btn

        local globalIdx
        for gi, gmd in ipairs(ALL_MODES) do if gmd.key == modeData.key then globalIdx = gi; break end end

        table.insert(modeButtons, { btn=btn, stroke=stroke, data=modeData, idx=globalIdx })

        btn.MouseButton1Click:Connect(function()
            if phase ~= "LOBBY" then return end
            selectedModeIdx = globalIdx
            refreshModeButtons()
        end)
    end
    Y += rows * (BTN_H + BTN_GAP) + 4
    makeDivider(Y); Y += 8
end

function refreshModeButtons()
    for _, mb in ipairs(modeButtons) do
        if mb.idx == selectedModeIdx then
            mb.stroke.Color = Color3.fromRGB(255,190,60)
            mb.stroke.Thickness = 2.5
            tween(mb.btn, 0.12, { BackgroundColor3 = Color3.fromRGB(40,26,10) })
        else
            mb.stroke.Color = Color3.fromRGB(40,30,15)
            mb.stroke.Thickness = 1
            tween(mb.btn, 0.12, { BackgroundColor3 = Color3.fromRGB(20,12,6) })
        end
    end
end

-- ========================================================
-- ステータス / ボタン
-- ========================================================
local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1,0,0,22)
statusLabel.Position = UDim2.new(0,0,0,Y)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "モードを選んで FIND MATCH を押してください"
statusLabel.Font = Enum.Font.Gotham
statusLabel.TextSize = 11
statusLabel.TextColor3 = Color3.fromRGB(140,120,80)
statusLabel.Parent = content
Y += 22

local waitTimeLabel = Instance.new("TextLabel")
waitTimeLabel.Size = UDim2.new(1,0,0,16)
waitTimeLabel.Position = UDim2.new(0,0,0,Y)
waitTimeLabel.BackgroundTransparency = 1
waitTimeLabel.Text = ""
waitTimeLabel.Font = Enum.Font.Gotham; waitTimeLabel.TextSize = 10
waitTimeLabel.TextColor3 = Color3.fromRGB(100,90,60); waitTimeLabel.Parent = content
Y += 16

local dotsLabel = Instance.new("TextLabel")
dotsLabel.Size = UDim2.new(1,0,0,18)
dotsLabel.Position = UDim2.new(0,0,0,Y)
dotsLabel.BackgroundTransparency = 1; dotsLabel.Text = ""
dotsLabel.Font = Enum.Font.GothamBold; dotsLabel.TextSize = 16
dotsLabel.TextColor3 = Color3.fromRGB(180,140,60); dotsLabel.Parent = content
Y += 18 + 6

local mainBtn = Instance.new("TextButton")
mainBtn.Size = UDim2.new(1,0,0,50)
mainBtn.Position = UDim2.new(0,0,0,Y)
mainBtn.BackgroundColor3 = Color3.fromRGB(200,150,40)
mainBtn.Font = Enum.Font.GothamBold; mainBtn.TextSize = 16
mainBtn.TextColor3 = Color3.fromRGB(20,15,5); mainBtn.Text = "FIND  MATCH"
mainBtn.Parent = content
Instance.new("UICorner", mainBtn).CornerRadius = UDim.new(0,10)
Y += 50 + 8

local acceptCountLabel = Instance.new("TextLabel")
acceptCountLabel.Size = UDim2.new(1,0,0,22)
acceptCountLabel.Position = UDim2.new(0,0,0,Y)
acceptCountLabel.BackgroundTransparency = 1; acceptCountLabel.Text = ""
acceptCountLabel.Font = Enum.Font.GothamBold; acceptCountLabel.TextSize = 18
acceptCountLabel.TextColor3 = Color3.fromRGB(255,100,80); acceptCountLabel.Parent = content
Y += 22

-- RP変動通知ラベル (試合後に表示)
local rpResultLabel = Instance.new("TextLabel")
rpResultLabel.Size = UDim2.new(1,0,0,24)
rpResultLabel.Position = UDim2.new(0,0,0,Y)
rpResultLabel.BackgroundTransparency = 1; rpResultLabel.Text = ""
rpResultLabel.Font = Enum.Font.GothamBold; rpResultLabel.TextSize = 20
rpResultLabel.TextColor3 = Color3.fromRGB(100,255,100); rpResultLabel.Parent = content
Y += 24

-- パネル高さを確定
panel.Size = UDim2.new(0,PANEL_W,0,Y+40)
panel.Position = UDim2.new(0.5,-PANEL_W/2,0.5,-(Y+40)/2)

-- ========================================================
-- ランクカード表示の更新
-- ========================================================
local function updateRankCard(rv, searchRange)
    rv = rv or currentRankValue
    local tier = PlayerData.getTier(rv)
    rankTierLabel.Text = tier.name
    rankTierLabel.TextColor3 = Color3.fromRGB(tier.r, tier.g, tier.b)
    rankValueLabel.Text = rv .. " RP"
    rankCardStroke.Color = Color3.fromRGB(tier.r, tier.g, tier.b)

    if searchRange then
        local maxRange = 600
        tween(rangeBarFill, 0.5, { Size = UDim2.new(math.min(searchRange/maxRange, 1), 0, 1, 0) })
        rangeLabel.Text = "検索範囲: ±" .. searchRange .. " RP"
    end
end

-- ========================================================
-- フェーズ切り替え
-- ========================================================
local queueStartTime = 0

local function setPhase_LOBBY(data)
    phase = "LOBBY"
    statusLabel.Text = "モードを選んで FIND MATCH を押してください"
    waitTimeLabel.Text = ""; dotsLabel.Text = ""; acceptCountLabel.Text = ""
    mainBtn.Text = "FIND  MATCH"
    mainBtn.BackgroundColor3 = Color3.fromRGB(200,150,40)
    mainBtn.TextColor3 = Color3.fromRGB(20,15,5); mainBtn.Active = true
    for _, mb in ipairs(modeButtons) do mb.btn.Active = true end
    tween(rangeBarFill, 0.5, { Size = UDim2.new(0,0,1,0) })
    rangeLabel.Text = "検索範囲: ±150 RP"
    refreshModeButtons()
end

local function setPhase_SEARCHING(data)
    phase = "SEARCHING"
    local md = selectedMode()
    statusLabel.Text = "マッチングを検索中... (" .. md.label .. ")"
    dotsLabel.Text = "・・・"
    mainBtn.Text = "CANCEL"
    mainBtn.BackgroundColor3 = Color3.fromRGB(60,60,80)
    mainBtn.TextColor3 = Color3.fromRGB(200,200,220); mainBtn.Active = true
    for _, mb in ipairs(modeButtons) do mb.btn.Active = false end
    queueStartTime = tick()
    if data then
        updateRankCard(data.rankValue, data.searchRange)
    end
end

local function setPhase_FOUND(data)
    phase = "FOUND"
    statusLabel.Text = "マッチが成立しました！"
    dotsLabel.Text = ""
    mainBtn.Text = "ACCEPT"
    mainBtn.BackgroundColor3 = Color3.fromRGB(60,200,100)
    mainBtn.TextColor3 = Color3.fromRGB(10,30,15); mainBtn.Active = true
    if data and data.acceptDeadline then
        task.spawn(function()
            while phase == "FOUND" do
                local rem = math.ceil(data.acceptDeadline - tick())
                if rem <= 0 then acceptCountLabel.Text = ""; break end
                acceptCountLabel.Text = rem .. " 秒以内に ACCEPT"
                task.wait(0.5)
            end
        end)
    end
end

local function setPhase_ACCEPTED(data)
    phase = "ACCEPTED"
    statusLabel.Text = "全員承認済み！ゲームに入ります..."
    mainBtn.Active = false
    mainBtn.BackgroundColor3 = Color3.fromRGB(40,40,60)
    acceptCountLabel.Text = ""
    if data and data.countdown then
        task.spawn(function()
            for i = data.countdown, 1, -1 do mainBtn.Text = "START  "..i; task.wait(1) end
            mainBtn.Text = "START"
        end)
    end
end

-- ========================================================
-- ドットアニメ
-- ========================================================
local dotFrames = {"・    ","・・   ","・・・  ","  ・・・","   ・・","    ・"}
local dotIdx, lastDotTime = 0, 0

RunService.RenderStepped:Connect(function()
    if phase ~= "SEARCHING" then return end
    local now = tick()
    if now - lastDotTime > 0.25 then
        lastDotTime = now; dotIdx = (dotIdx % #dotFrames) + 1
        dotsLabel.Text = dotFrames[dotIdx]
    end
    local e = math.floor(now - queueStartTime)
    waitTimeLabel.Text = string.format("待機時間: %02d:%02d", math.floor(e/60), e%60)
end)

-- ========================================================
-- ボタン操作
-- ========================================================
backBtn.MouseButton1Click:Connect(function()
    if phase == "SEARCHING" then Ranked_Leave:FireServer() end
    gui.Enabled = false
    -- メインメニューに戻る
    local mmGui = localPlayer:WaitForChild("PlayerGui"):WaitForChild("MainMenuUI", 5)
    if mmGui then mmGui.Enabled = true end
end)

mainBtn.MouseButton1Click:Connect(function()
    if phase == "LOBBY" then
        local md = selectedMode()
        Ranked_Join:FireServer(md.key)
        setPhase_SEARCHING({ rankValue = currentRankValue, searchRange = 150 })
    elseif phase == "SEARCHING" then
        Ranked_Leave:FireServer(); setPhase_LOBBY({})
    elseif phase == "FOUND" then
        Ranked_Accept:FireServer()
        mainBtn.Text = "ACCEPTED ✓"; mainBtn.Active = false
        mainBtn.BackgroundColor3 = Color3.fromRGB(40,40,60)
    end
end)

-- ========================================================
-- サーバーからの状態更新
-- ========================================================
Ranked_StateUpdate.OnClientEvent:Connect(function(newPhase, data)
    if data and data.mode then
        for gi, gmd in ipairs(ALL_MODES) do
            if gmd.key == data.mode then selectedModeIdx = gi; break end
        end
    end

    if newPhase == "LOBBY"     then setPhase_LOBBY(data)
    elseif newPhase == "SEARCHING" then setPhase_SEARCHING(data)
    elseif newPhase == "FOUND"     then setPhase_FOUND(data)
    elseif newPhase == "ACCEPTED"  then setPhase_ACCEPTED(data)
    elseif newPhase == "START"     then gui.Enabled = false
    elseif newPhase == "RANK_RESULT" then
        -- RP変動を一時的に表示
        if data and data.rpChange then
            local rp = data.rpChange
            rpResultLabel.Text = (rp >= 0 and "+" or "") .. rp .. " RP"
            rpResultLabel.TextColor3 = rp >= 0 and Color3.fromRGB(80,255,80) or Color3.fromRGB(255,80,80)
            currentRankValue = data.newRankValue or currentRankValue
            updateRankCard(currentRankValue, nil)
            task.delay(4, function() rpResultLabel.Text = "" end)
        end
    end
end)

-- ラウンドイベント: 試合終了後に表示
local RoundEvent = Remotes:WaitForChild("RoundEvent")
RoundEvent.OnClientEvent:Connect(function(eventType)
    if eventType == "MATCH_WIN" or eventType == "MATCH_LOSE" then
        task.delay(6, function()
            gui.Enabled = true
            setPhase_LOBBY({})
        end)
    end
end)

-- プレイヤーデータ更新
PlayerDataUpdated.OnClientEvent:Connect(function(data)
    if data then
        currentRankValue = data.rankValue or currentRankValue
        updateRankCard(currentRankValue, nil)
    end
end)

-- 初期データ取得
task.spawn(function()
    local ok, data = pcall(function() return GetPlayerData:InvokeServer() end)
    if ok and data then
        currentRankValue = data.rankValue or PlayerData.DEFAULT_RANK_VALUE
        updateRankCard(currentRankValue, nil)
    end
end)

refreshModeButtons()
setPhase_LOBBY({})

print("[RankedUI] 起動完了")
