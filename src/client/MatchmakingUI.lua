-- MatchmakingUI.lua (Client)
-- 7モード対応 ロビー画面
--
-- モード構成:
--   【2チーム対戦】 1v1 / 2v2 / 3v3 / 5v5
--   【3チーム対戦】 1v1v1 / 2v2v2 / 3v3v3

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")
local RunService        = game:GetService("RunService")

local Remotes        = ReplicatedStorage:WaitForChild("Remotes")
local MM_JoinQueue   = Remotes:WaitForChild("MM_JoinQueue")
local MM_LeaveQueue  = Remotes:WaitForChild("MM_LeaveQueue")
local MM_Accept      = Remotes:WaitForChild("MM_Accept")
local MM_StateUpdate = Remotes:WaitForChild("MM_StateUpdate")

local localPlayer = Players.LocalPlayer
local phase = "LOBBY"

-- ========================================================
-- モード定義 (クライアント表示用)
-- ========================================================
local SECTIONS = {
    {
        header = "2チーム対戦",
        cols   = 2,      -- 1行に何個並べるか
        modes  = {
            { key="1v1",  label="1 v 1",  sub="2人",  icon="⚔",  needed=2,  maxSlots=2,
              color=Color3.fromRGB(255,215,50),  dimColor=Color3.fromRGB(60,50,10) },
            { key="2v2",  label="2 v 2",  sub="4人",  icon="🛡",  needed=4,  maxSlots=4,
              color=Color3.fromRGB(70,195,255),  dimColor=Color3.fromRGB(10,50,65) },
            { key="3v3",  label="3 v 3",  sub="6人",  icon="⚔⚔", needed=6,  maxSlots=6,
              color=Color3.fromRGB(80,220,120),  dimColor=Color3.fromRGB(10,55,25) },
            { key="5v5",  label="5 v 5",  sub="10人", icon="🛡🛡", needed=10, maxSlots=10,
              color=Color3.fromRGB(255,130,60),  dimColor=Color3.fromRGB(65,30,10) },
        },
    },
    {
        header = "3チーム対戦",
        cols   = 3,
        modes  = {
            { key="1v1v1", label="1v1v1", sub="3人",  icon="💥",    needed=3,  maxSlots=3,
              color=Color3.fromRGB(200,100,255), dimColor=Color3.fromRGB(50,20,65) },
            { key="2v2v2", label="2v2v2", sub="6人",  icon="💥💥",  needed=6,  maxSlots=6,
              color=Color3.fromRGB(200,100,255), dimColor=Color3.fromRGB(50,20,65) },
            { key="3v3v3", label="3v3v3", sub="9人",  icon="💥💥💥",needed=9,  maxSlots=9,
              color=Color3.fromRGB(200,100,255), dimColor=Color3.fromRGB(50,20,65) },
        },
    },
}

-- フラットリスト (インデックス検索用)
local ALL_MODES = {}
for _, sec in ipairs(SECTIONS) do
    for _, md in ipairs(sec.modes) do
        table.insert(ALL_MODES, md)
    end
end

local selectedModeIdx = 1   -- デフォルト: 1v1
local modeButtons = {}      -- { btn, stroke, data }[]

-- ========================================================
-- ユーティリティ
-- ========================================================
local function tween(obj, t, goals)
    TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Quad), goals):Play()
end

local function selectedMode()
    return ALL_MODES[selectedModeIdx]
end

-- ========================================================
-- ScreenGui + パネル
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name           = "MatchmakingUI"
gui.ResetOnSpawn   = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset = true
gui.Enabled        = false   -- MainMenuUI の「カジュアル」ボタンから開く
gui.Parent         = localPlayer:WaitForChild("PlayerGui")

local overlay = Instance.new("Frame")
overlay.Size = UDim2.new(1,0,1,0)
overlay.BackgroundColor3 = Color3.fromRGB(8,8,12)
overlay.BackgroundTransparency = 0.2
overlay.Parent = gui

-- パネル (高さ: タイトル + セクション2つ + 操作部)
local PANEL_W = 400
local panel = Instance.new("Frame")
panel.Size     = UDim2.new(0, PANEL_W, 0, 660)
panel.Position = UDim2.new(0.5, -PANEL_W/2, 0.5, -330)
panel.BackgroundColor3 = Color3.fromRGB(16, 16, 24)
panel.Parent = gui
do
    local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0,16); c.Parent = panel
    local s = Instance.new("UIStroke"); s.Color = Color3.fromRGB(60,60,90); s.Thickness = 1; s.Parent = panel
end

local INNER_W = PANEL_W - 40   -- 左右 20px パディング
local content = Instance.new("Frame")
content.Size = UDim2.new(1,-40,1,-40)
content.Position = UDim2.new(0,20,0,20)
content.BackgroundTransparency = 1
content.Parent = panel

-- ========================================================
-- ヘッダー (タイトル + サブ)
-- ========================================================
local Y = 0   -- 縦位置トラッカー

-- 戻るボタン (メインメニューへ)
local backBtn = Instance.new("TextButton")
backBtn.Size = UDim2.new(0,30,0,30)
backBtn.Position = UDim2.new(0,-2,0,Y)
backBtn.BackgroundColor3 = Color3.fromRGB(18,32,20)
backBtn.Font = Enum.Font.GothamBold; backBtn.TextSize = 14
backBtn.TextColor3 = Color3.fromRGB(80,200,100); backBtn.Text = "←"
backBtn.Parent = content
Instance.new("UICorner", backBtn).CornerRadius = UDim.new(0,6)
backBtn.MouseButton1Click:Connect(function()
    if phase == "SEARCHING" then MM_LeaveQueue:FireServer() end
    gui.Enabled = false
    local mmGui = localPlayer:WaitForChild("PlayerGui"):WaitForChild("MainMenuUI", 5)
    if mmGui then mmGui.Enabled = true end
end)

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1,-36,0,30)
titleLabel.Position = UDim2.new(0,36,0,Y)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "🎮  カジュアル"
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 22
titleLabel.TextColor3 = Color3.fromRGB(100,230,120)
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = content
Y += 38

local subtitleLabel = Instance.new("TextLabel")
subtitleLabel.Size = UDim2.new(1,0,0,18)
subtitleLabel.Position = UDim2.new(0,0,0,Y)
subtitleLabel.BackgroundTransparency = 1
subtitleLabel.Text = "モードを選んでマッチングを開始"
subtitleLabel.Font = Enum.Font.Gotham
subtitleLabel.TextSize = 12
subtitleLabel.TextColor3 = Color3.fromRGB(140,140,180)
subtitleLabel.Parent = content
Y += 18 + 8

local function makeDivider(posY)
    local d = Instance.new("Frame")
    d.Size = UDim2.new(1,0,0,1)
    d.Position = UDim2.new(0,0,0,posY)
    d.BackgroundColor3 = Color3.fromRGB(50,50,70)
    d.Parent = content
end

makeDivider(Y); Y += 8

-- ========================================================
-- モードセクションを動的生成
-- ========================================================
local BTN_H     = 72    -- ボタン高さ
local BTN_GAP   = 6     -- ボタン間隔

for _, section in ipairs(SECTIONS) do
    -- セクションヘッダー
    local hdr = Instance.new("TextLabel")
    hdr.Size = UDim2.new(1,0,0,20)
    hdr.Position = UDim2.new(0,0,0,Y)
    hdr.BackgroundTransparency = 1
    hdr.Text = "─  " .. section.header .. "  ─"
    hdr.Font = Enum.Font.GothamBold
    hdr.TextSize = 10
    hdr.TextColor3 = Color3.fromRGB(110,110,150)
    hdr.Parent = content
    Y += 22

    local cols  = section.cols
    local btnW  = math.floor((INNER_W - BTN_GAP * (cols - 1)) / cols)
    local rows  = math.ceil(#section.modes / cols)

    for i, modeData in ipairs(section.modes) do
        local col = (i - 1) % cols
        local row = math.floor((i - 1) / cols)
        local bx  = col * (btnW + BTN_GAP)
        local by  = Y + row * (BTN_H + BTN_GAP)

        local btn = Instance.new("TextButton")
        btn.Name = modeData.key
        btn.Size = UDim2.new(0, btnW, 0, BTN_H)
        btn.Position = UDim2.new(0, bx, 0, by)
        btn.BackgroundColor3 = modeData.dimColor
        btn.Parent = content
        Instance.new("UICorner", btn).CornerRadius = UDim.new(0,10)

        local stroke = Instance.new("UIStroke")
        stroke.Color = Color3.fromRGB(40,40,55)
        stroke.Thickness = 1.5
        stroke.Parent = btn

        -- アイコン
        local iconL = Instance.new("TextLabel")
        iconL.Size = UDim2.new(0,36,1,0)
        iconL.Position = UDim2.new(0,6,0,0)
        iconL.BackgroundTransparency = 1
        iconL.Text = modeData.icon
        iconL.Font = Enum.Font.GothamBold
        iconL.TextSize = 20
        iconL.TextColor3 = Color3.fromRGB(230,230,255)
        iconL.Parent = btn

        -- モード名
        local nameL = Instance.new("TextLabel")
        nameL.Size = UDim2.new(1,-46,0,28)
        nameL.Position = UDim2.new(0,44,0,10)
        nameL.BackgroundTransparency = 1
        nameL.Text = modeData.label
        nameL.Font = Enum.Font.GothamBold
        nameL.TextSize = 14
        nameL.TextColor3 = Color3.fromRGB(220,220,255)
        nameL.TextXAlignment = Enum.TextXAlignment.Left
        nameL.Parent = btn

        -- 人数
        local subL = Instance.new("TextLabel")
        subL.Size = UDim2.new(1,-46,0,18)
        subL.Position = UDim2.new(0,44,0,40)
        subL.BackgroundTransparency = 1
        subL.Text = modeData.sub
        subL.Font = Enum.Font.Gotham
        subL.TextSize = 10
        subL.TextColor3 = Color3.fromRGB(120,120,160)
        subL.TextXAlignment = Enum.TextXAlignment.Left
        subL.Parent = btn

        -- グローバルインデックス検索
        local globalIdx
        for gi, gmd in ipairs(ALL_MODES) do
            if gmd.key == modeData.key then globalIdx = gi; break end
        end

        table.insert(modeButtons, { btn = btn, stroke = stroke, data = modeData, idx = globalIdx })

        btn.MouseButton1Click:Connect(function()
            if phase ~= "LOBBY" then return end
            selectedModeIdx = globalIdx
            refreshModeButtons()
        end)
    end

    Y += rows * (BTN_H + BTN_GAP) + 4
    makeDivider(Y); Y += 10
end

-- ========================================================
-- モードボタンの強調表示を更新
-- ========================================================
function refreshModeButtons()
    for _, mb in ipairs(modeButtons) do
        local md = mb.data
        if mb.idx == selectedModeIdx then
            mb.stroke.Color     = md.color
            mb.stroke.Thickness = 2.5
            tween(mb.btn, 0.12, { BackgroundColor3 = md.dimColor })
        else
            mb.stroke.Color     = Color3.fromRGB(35,35,50)
            mb.stroke.Thickness = 1
            tween(mb.btn, 0.12, { BackgroundColor3 = Color3.fromRGB(18,18,28) })
        end
    end
    -- スロットをモードの maxSlots に合わせて更新
    local md = selectedMode()
    refreshSlots(0, md.maxSlots)
end

-- ========================================================
-- プレイヤースロット (最大10マス: 5v5対応)
-- ========================================================
local slotsFrame = Instance.new("Frame")
slotsFrame.Size = UDim2.new(1,0,0,44)
slotsFrame.Position = UDim2.new(0,0,0,Y)
slotsFrame.BackgroundTransparency = 1
slotsFrame.Parent = content

local slotLayout = Instance.new("UIListLayout")
slotLayout.FillDirection = Enum.FillDirection.Horizontal
slotLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
slotLayout.Padding = UDim.new(0,4)
slotLayout.Parent = slotsFrame

local slots = {}
for i = 1, 10 do
    local slot = Instance.new("Frame")
    slot.Size = UDim2.new(0, 34, 0, 34)
    slot.BackgroundColor3 = Color3.fromRGB(30,30,45)
    slot.Parent = slotsFrame
    Instance.new("UICorner", slot).CornerRadius = UDim.new(0,6)
    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(1,0,1,0)
    lbl.BackgroundTransparency = 1
    lbl.Text = tostring(i)
    lbl.Font = Enum.Font.GothamBold
    lbl.TextSize = 11
    lbl.TextColor3 = Color3.fromRGB(60,60,80)
    lbl.Parent = slot
    slots[i] = { frame = slot, label = lbl }
end

function refreshSlots(filledCount, maxCount)
    for i, s in ipairs(slots) do
        s.frame.Visible = (i <= maxCount)
        if i <= maxCount then
            if i <= filledCount then
                s.frame.BackgroundColor3 = Color3.fromRGB(50,120,200)
                s.label.TextColor3 = Color3.fromRGB(200,220,255)
            else
                s.frame.BackgroundColor3 = Color3.fromRGB(30,30,45)
                s.label.TextColor3 = Color3.fromRGB(60,60,80)
            end
        end
    end
end

Y += 50

-- ========================================================
-- ステータス / ドット / ボタン
-- ========================================================
local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1,0,0,26)
statusLabel.Position = UDim2.new(0,0,0,Y)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "モードを選んで FIND MATCH を押してください"
statusLabel.Font = Enum.Font.Gotham
statusLabel.TextSize = 11
statusLabel.TextColor3 = Color3.fromRGB(140,140,180)
statusLabel.Parent = content
Y += 26

local waitTimeLabel = Instance.new("TextLabel")
waitTimeLabel.Size = UDim2.new(1,0,0,16)
waitTimeLabel.Position = UDim2.new(0,0,0,Y)
waitTimeLabel.BackgroundTransparency = 1
waitTimeLabel.Text = ""
waitTimeLabel.Font = Enum.Font.Gotham
waitTimeLabel.TextSize = 10
waitTimeLabel.TextColor3 = Color3.fromRGB(100,100,130)
waitTimeLabel.Parent = content
Y += 16

local dotsLabel = Instance.new("TextLabel")
dotsLabel.Size = UDim2.new(1,0,0,18)
dotsLabel.Position = UDim2.new(0,0,0,Y)
dotsLabel.BackgroundTransparency = 1
dotsLabel.Text = ""
dotsLabel.Font = Enum.Font.GothamBold
dotsLabel.TextSize = 16
dotsLabel.TextColor3 = Color3.fromRGB(100,100,160)
dotsLabel.Parent = content
Y += 18 + 6

local mainBtn = Instance.new("TextButton")
mainBtn.Size = UDim2.new(1,0,0,50)
mainBtn.Position = UDim2.new(0,0,0,Y)
mainBtn.BackgroundColor3 = Color3.fromRGB(255,220,60)
mainBtn.Font = Enum.Font.GothamBold
mainBtn.TextSize = 16
mainBtn.TextColor3 = Color3.fromRGB(20,20,30)
mainBtn.Text = "FIND  MATCH"
mainBtn.Parent = content
Instance.new("UICorner", mainBtn).CornerRadius = UDim.new(0,10)
Y += 50 + 8

local acceptCountLabel = Instance.new("TextLabel")
acceptCountLabel.Size = UDim2.new(1,0,0,22)
acceptCountLabel.Position = UDim2.new(0,0,0,Y)
acceptCountLabel.BackgroundTransparency = 1
acceptCountLabel.Text = ""
acceptCountLabel.Font = Enum.Font.GothamBold
acceptCountLabel.TextSize = 18
acceptCountLabel.TextColor3 = Color3.fromRGB(255,100,80)
acceptCountLabel.Parent = content
Y += 22

local onlineLabel = Instance.new("TextLabel")
onlineLabel.Size = UDim2.new(1,0,0,18)
onlineLabel.Position = UDim2.new(0,0,0,Y)
onlineLabel.BackgroundTransparency = 1
onlineLabel.Text = "オンライン: -- 人"
onlineLabel.Font = Enum.Font.Gotham
onlineLabel.TextSize = 10
onlineLabel.TextColor3 = Color3.fromRGB(100,100,130)
onlineLabel.Parent = content

-- パネル高さをコンテンツに合わせて調整
panel.Size = UDim2.new(0, PANEL_W, 0, Y + 56)
panel.Position = UDim2.new(0.5, -PANEL_W/2, 0.5, -(Y + 56)/2)

-- ========================================================
-- フェーズ切り替え
-- ========================================================
local queueStartTime = 0

local function setPhase_LOBBY(data)
    phase = "LOBBY"
    subtitleLabel.Text = "モードを選んでマッチングを開始"
    statusLabel.Text   = "モードを選んで FIND MATCH を押してください"
    waitTimeLabel.Text = ""
    dotsLabel.Text     = ""
    acceptCountLabel.Text = ""
    mainBtn.Text = "FIND  MATCH"
    mainBtn.BackgroundColor3 = Color3.fromRGB(255,220,60)
    mainBtn.TextColor3 = Color3.fromRGB(20,20,30)
    mainBtn.Active = true
    for _, mb in ipairs(modeButtons) do mb.btn.Active = true end
    if data and data.onlineCount then
        onlineLabel.Text = "オンライン: " .. data.onlineCount .. " 人"
    end
    refreshModeButtons()
end

local function setPhase_SEARCHING(data)
    phase = "SEARCHING"
    local md     = selectedMode()
    local cur    = data and data.current or 1
    local needed = data and data.needed  or md.needed
    subtitleLabel.Text = md.label
    statusLabel.Text   = "マッチングを検索中...  " .. cur .. " / " .. needed
    dotsLabel.Text     = "・・・"
    mainBtn.Text = "CANCEL"
    mainBtn.BackgroundColor3 = Color3.fromRGB(60,60,80)
    mainBtn.TextColor3 = Color3.fromRGB(200,200,220)
    mainBtn.Active = true
    for _, mb in ipairs(modeButtons) do mb.btn.Active = false end
    queueStartTime = tick()
    refreshSlots(cur, md.maxSlots)
end

local function setPhase_FOUND(data)
    phase = "FOUND"
    statusLabel.Text = "マッチが成立しました！"
    dotsLabel.Text   = ""
    mainBtn.Text     = "ACCEPT"
    mainBtn.BackgroundColor3 = Color3.fromRGB(60,200,100)
    mainBtn.TextColor3 = Color3.fromRGB(10,30,15)
    mainBtn.Active   = true
    local md = selectedMode()
    for i, s in ipairs(slots) do
        if i <= md.maxSlots then
            s.frame.BackgroundColor3 = Color3.fromRGB(40,160,80)
            s.label.TextColor3 = Color3.fromRGB(180,255,200)
        end
    end
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
    mainBtn.TextColor3 = Color3.fromRGB(100,100,130)
    acceptCountLabel.Text = ""
    if data and data.countdown then
        task.spawn(function()
            for i = data.countdown, 1, -1 do
                mainBtn.Text = "START  " .. i
                task.wait(1)
            end
            mainBtn.Text = "START"
        end)
    end
end

-- ========================================================
-- ドットアニメ
-- ========================================================
local dotFrames = { "・    ", "・・   ", "・・・  ", "  ・・・", "   ・・", "    ・" }
local dotIdx, lastDotTime = 0, 0

RunService.RenderStepped:Connect(function()
    if phase ~= "SEARCHING" then return end
    local now = tick()
    if now - lastDotTime > 0.25 then
        lastDotTime = now
        dotIdx = (dotIdx % #dotFrames) + 1
        dotsLabel.Text = dotFrames[dotIdx]
    end
    local e = math.floor(now - queueStartTime)
    waitTimeLabel.Text = string.format("待機時間: %02d:%02d", math.floor(e/60), e%60)
end)

-- ========================================================
-- ボタン操作
-- ========================================================
mainBtn.MouseButton1Click:Connect(function()
    if phase == "LOBBY" then
        local md = selectedMode()
        MM_JoinQueue:FireServer(md.key)
        setPhase_SEARCHING({ current = 1, needed = md.needed })
    elseif phase == "SEARCHING" then
        MM_LeaveQueue:FireServer()
        setPhase_LOBBY({})
    elseif phase == "FOUND" then
        MM_Accept:FireServer()
        mainBtn.Text = "ACCEPTED ✓"
        mainBtn.Active = false
        mainBtn.BackgroundColor3 = Color3.fromRGB(40,40,60)
    end
end)

-- ========================================================
-- サーバーからの状態更新
-- ========================================================
MM_StateUpdate.OnClientEvent:Connect(function(newPhase, data)
    -- サーバー側のモードで selectedModeIdx を同期
    if data and data.mode then
        for gi, gmd in ipairs(ALL_MODES) do
            if gmd.key == data.mode then selectedModeIdx = gi; break end
        end
    end
    if     newPhase == "LOBBY"     then setPhase_LOBBY(data)
    elseif newPhase == "SEARCHING" then setPhase_SEARCHING(data)
    elseif newPhase == "FOUND"     then setPhase_FOUND(data)
    elseif newPhase == "ACCEPTED"  then setPhase_ACCEPTED(data)
    elseif newPhase == "START"     then gui.Enabled = false
    end
end)

-- ラウンドイベント
local RoundEvent = Remotes:WaitForChild("RoundEvent")
RoundEvent.OnClientEvent:Connect(function(eventType, _data)
    if eventType == "ROUND_START" then
        gui.Enabled = false
    elseif eventType == "MATCH_WIN" or eventType == "MATCH_LOSE" then
        task.delay(5, function()
            gui.Enabled = true
            setPhase_LOBBY({ onlineCount = #Players:GetPlayers() })
        end)
    end
end)

-- 初期化
refreshModeButtons()
setPhase_LOBBY({ onlineCount = #Players:GetPlayers() })

print("[MatchmakingUI] 起動完了 (7モード選択版)")
