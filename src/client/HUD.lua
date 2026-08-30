-- HUD.lua (Client) v2
-- スケッチに沿ったレイアウト
--
-- 画面構成:
--   ┌──────────────────────────────────────────────────┐
--   │ [プレイヤー / チームスコア]  [タイマー]  [リミッター] │ ← トップバー
--   │                                                    │
--   │   [ステータス表 (設定でON/OFF)]     キルフィード→   │
--   │                                                    │
--   │                                         [JUMP↑]   │ ← 右下
--   └──────────────────────────────────────────────────┘

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")
local RunService        = game:GetService("RunService")
local UserInputService  = game:GetService("UserInputService")

local Shared        = ReplicatedStorage:WaitForChild("Shared")
local LimiterConfig = require(Shared:WaitForChild("LimiterConfig"))

local Remotes        = ReplicatedStorage:WaitForChild("Remotes")
local KillFeed       = Remotes:WaitForChild("KillFeed")
local ScoreUpdate    = Remotes:WaitForChild("ScoreUpdate")
local LimiterChanged = Remotes:WaitForChild("LimiterChanged")
local RoundEvent     = Remotes:WaitForChild("RoundEvent")
local TimerUpdate    = Remotes:WaitForChild("TimerUpdate")
local SetLimiterRatio = Remotes:WaitForChild("SetLimiterRatio")
local GetLimiterRatio = Remotes:WaitForChild("GetLimiterRatio")

local localPlayer = Players.LocalPlayer

-- ========================================================
-- ScreenGui
-- ========================================================
local gui = Instance.new("ScreenGui")
gui.Name             = "MainHUD"
gui.ResetOnSpawn     = false
gui.ZIndexBehavior   = Enum.ZIndexBehavior.Sibling
gui.IgnoreGuiInset   = true
gui.Enabled          = false  -- 試合開始まで非表示
gui.Parent           = localPlayer:WaitForChild("PlayerGui")

-- ========================================================
-- ユーティリティ
-- ========================================================
local function corner(parent, r)
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0, r or 8)
    c.Parent = parent
end
local function tween(obj, t, goals)
    TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Quad), goals):Play()
end
local function label(props)
    local l = Instance.new("TextLabel")
    l.BackgroundTransparency = 1
    l.Font     = props.font  or Enum.Font.GothamBold
    l.TextSize = props.size  or 13
    l.Text     = props.text  or ""
    l.TextColor3 = props.color or Color3.fromRGB(220, 220, 255)
    l.Size     = props.sz    or UDim2.new(0, 80, 1, 0)
    l.Position = props.pos   or UDim2.new(0, 0, 0, 0)
    l.TextXAlignment = props.xa or Enum.TextXAlignment.Center
    l.TextYAlignment = props.ya or Enum.TextYAlignment.Center
    l.Parent   = props.parent
    return l
end

-- ========================================================
-- ① トップバー (画面幅いっぱい)
-- ========================================================
local TOP_H = 44

local topBar = Instance.new("Frame")
topBar.Name = "TopBar"
topBar.Size = UDim2.new(1, 0, 0, TOP_H)
topBar.Position = UDim2.new(0, 0, 0, 0)
topBar.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
topBar.BackgroundTransparency = 0.15
topBar.Parent = gui

-- ── 左: プレイヤー名 & スコア ──────────────────
local scoreSection = Instance.new("Frame")
scoreSection.Size = UDim2.new(0.35, 0, 1, 0)
scoreSection.BackgroundTransparency = 1
scoreSection.Parent = topBar

local teamALabel = label({
    text  = localPlayer.Name,
    size  = 12,
    color = Color3.fromRGB(100, 200, 255),
    sz    = UDim2.new(0.45, 0, 1, 0),
    pos   = UDim2.new(0, 8, 0, 0),
    xa    = Enum.TextXAlignment.Left,
    parent = scoreSection,
})

local scoreLabel = label({
    text  = "0  :  0",
    size  = 20,
    color = Color3.fromRGB(255, 220, 60),
    sz    = UDim2.new(0.3, 0, 1, 0),
    pos   = UDim2.new(0.35, 0, 0, 0),
    parent = scoreSection,
})

-- ── 中央: ラウンド + タイマー ──────────────────
local centerSection = Instance.new("Frame")
centerSection.Size = UDim2.new(0.3, 0, 1, 0)
centerSection.Position = UDim2.new(0.35, 0, 0, 0)
centerSection.BackgroundTransparency = 1
centerSection.Parent = topBar

local roundLabel = label({
    text  = "ROUND  1 / 3",
    size  = 10,
    color = Color3.fromRGB(160, 160, 200),
    sz    = UDim2.new(1, 0, 0, 14),
    pos   = UDim2.new(0, 0, 0, 2),
    parent = centerSection,
})

local timerLabel = label({
    text  = "3:00",
    size  = 22,
    color = Color3.fromRGB(255, 255, 255),
    sz    = UDim2.new(1, 0, 0, 28),
    pos   = UDim2.new(0, 0, 0, 14),
    parent = centerSection,
})

-- ── 右: リミッタースライダー ──────────────────
local limSection = Instance.new("Frame")
limSection.Size = UDim2.new(0.35, 0, 1, 0)
limSection.Position = UDim2.new(0.65, 0, 0, 0)
limSection.BackgroundTransparency = 1
limSection.Parent = topBar

-- 「LIMITER」文字
label({
    text   = "LIMITER",
    size   = 9,
    color  = Color3.fromRGB(255, 220, 60),
    sz     = UDim2.new(0, 54, 0, 14),
    pos    = UDim2.new(0, 4, 0, 3),
    xa     = Enum.TextXAlignment.Left,
    parent = limSection,
})

-- ⚔ アイコン
label({ text="⚔", size=12, color=Color3.fromRGB(255,100,80),
    sz=UDim2.new(0,16,1,0), pos=UDim2.new(0,4,0,14), parent=limSection })

-- スライダートラック
local lTrack = Instance.new("Frame")
lTrack.Size = UDim2.new(1, -80, 0, 8)
lTrack.Position = UDim2.new(0, 22, 0.5, -4)
lTrack.BackgroundColor3 = Color3.fromRGB(45, 45, 65)
lTrack.Parent = limSection
corner(lTrack, 4)

local lFill = Instance.new("Frame")
lFill.Size = UDim2.new(0.5, 0, 1, 0)
lFill.BackgroundColor3 = Color3.fromRGB(180, 180, 255)
lFill.Parent = lTrack
corner(lFill, 4)

local lKnob = Instance.new("Frame")
lKnob.Size = UDim2.new(0, 16, 0, 16)
lKnob.AnchorPoint = Vector2.new(0.5, 0.5)
lKnob.Position = UDim2.new(0.5, 0, 0.5, 0)
lKnob.BackgroundColor3 = Color3.fromRGB(255, 230, 80)
lKnob.Parent = lTrack
corner(lKnob, 8)

-- ❤ アイコン
label({ text="❤", size=12, color=Color3.fromRGB(80,220,120),
    sz=UDim2.new(0,16,1,0), pos=UDim2.new(1,-20,0,14), parent=limSection })

-- 比率テキスト
local lRatioText = label({
    text   = "ATK 50% / HP 50%",
    size   = 8,
    color  = Color3.fromRGB(120,120,160),
    sz     = UDim2.new(1,-80,0,12),
    pos    = UDim2.new(0,22,1,-12),
    parent = limSection,
})

-- プリセットラベル (現在のプリセット名)
local lPresetText = label({
    text   = "バランス",
    size   = 9,
    color  = Color3.fromRGB(200,200,240),
    sz     = UDim2.new(0,54,0,14),
    pos    = UDim2.new(0,4,1,-14),
    xa     = Enum.TextXAlignment.Left,
    parent = limSection,
})

-- ========================================================
-- スライダー操作
-- ========================================================
local currentRatio  = 0.5
local isDragging    = false
local lastChangedAt = 0

local function getPresetName(ratio)
    local closest, closestDist = "バランス", 999
    for _, p in pairs(LimiterConfig.PRESETS) do
        local d = math.abs(p.ratio - ratio)
        if d < closestDist then
            closestDist = d
            closest = p.label
        end
    end
    return closest
end

local function updateLimiterVisual(ratio)
    ratio = math.clamp(ratio, 0, 1)
    local r = math.floor(80  + 175 * ratio)
    local g = math.floor(220 - 140 * ratio)
    local b = math.floor(80  + 120 * (1 - ratio))
    local col = Color3.fromRGB(r, g, b)

    tween(lFill,  0.25, { Size = UDim2.new(ratio, 0, 1, 0), BackgroundColor3 = col })
    tween(lKnob,  0.25, { Position = UDim2.new(ratio, 0, 0.5, 0), BackgroundColor3 = col })

    local pct = math.floor(ratio * 100)
    lRatioText.Text  = "ATK " .. pct .. "% / HP " .. (100 - pct) .. "%"
    lPresetText.Text = getPresetName(ratio)
end

lTrack.InputBegan:Connect(function(inp)
    if inp.UserInputType == Enum.UserInputType.MouseButton1 or
       inp.UserInputType == Enum.UserInputType.Touch then
        isDragging = true
    end
end)

UserInputService.InputEnded:Connect(function(inp)
    if (inp.UserInputType == Enum.UserInputType.MouseButton1 or
        inp.UserInputType == Enum.UserInputType.Touch) and isDragging then
        isDragging = false
        local now = tick()
        if now - lastChangedAt >= LimiterConfig.CHANGE_COOLDOWN then
            lastChangedAt = now
            SetLimiterRatio:FireServer(currentRatio)
        end
    end
end)

RunService.RenderStepped:Connect(function()
    if not isDragging then return end
    local mouse     = UserInputService:GetMouseLocation()
    local trackPos  = lTrack.AbsolutePosition
    local trackSize = lTrack.AbsoluteSize
    local ratio     = math.clamp((mouse.X - trackPos.X) / trackSize.X, 0, 1)
    currentRatio    = ratio
    updateLimiterVisual(ratio)
end)

-- ========================================================
-- ② ステータス表 (左中央, 設定でON/OFF)
-- ========================================================
local statusVisible = true   -- 設定でトグル

local statusTable = Instance.new("Frame")
statusTable.Name = "StatusTable"
statusTable.Size = UDim2.new(0, 160, 0, 76)
statusTable.Position = UDim2.new(0, 12, 0, TOP_H + 8)
statusTable.BackgroundColor3 = Color3.fromRGB(10, 10, 18)
statusTable.BackgroundTransparency = 0.3
statusTable.Parent = gui
corner(statusTable, 8)

local ST_ROWS = {
    { key="atk",  icon="⚔",  labelTxt="ATK 倍率",  color=Color3.fromRGB(255,100,80)  },
    { key="hp",   icon="❤",  labelTxt="HP",        color=Color3.fromRGB(80,220,120)  },
    { key="spd",  icon="💨", labelTxt="スピード",   color=Color3.fromRGB(100,180,255) },
}
local statusValueLabels = {}

for i, row in ipairs(ST_ROWS) do
    local y = (i - 1) * 24 + 4
    -- アイコン
    label({ text=row.icon, size=11, color=row.color,
        sz=UDim2.new(0,20,0,22), pos=UDim2.new(0,4,0,y), parent=statusTable })
    -- ラベル
    label({ text=row.labelTxt, size=10, color=Color3.fromRGB(140,140,180),
        sz=UDim2.new(0,72,0,22), pos=UDim2.new(0,24,0,y),
        xa=Enum.TextXAlignment.Left, parent=statusTable })
    -- 値
    local val = label({ text="--", size=11, color=Color3.fromRGB(220,220,255),
        sz=UDim2.new(0,56,0,22), pos=UDim2.new(0,100,0,y),
        xa=Enum.TextXAlignment.Right, parent=statusTable })
    statusValueLabels[row.key] = val
end

local function updateStatusTable(stats)
    statusValueLabels["atk"].Text = string.format("x%.2f", stats.damageMult)
    statusValueLabels["hp"].Text  = tostring(stats.maxHP)
    statusValueLabels["spd"].Text = tostring(stats.walkSpeed)
end

-- ステータス表のON/OFFトグルボタン (歯車アイコン風)
local toggleStatusBtn = Instance.new("TextButton")
toggleStatusBtn.Size = UDim2.new(0, 24, 0, 24)
toggleStatusBtn.Position = UDim2.new(0, 150, 0, TOP_H + 8)
toggleStatusBtn.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
toggleStatusBtn.Text = "⚙"
toggleStatusBtn.Font = Enum.Font.GothamBold
toggleStatusBtn.TextSize = 12
toggleStatusBtn.TextColor3 = Color3.fromRGB(160, 160, 200)
toggleStatusBtn.Parent = gui
corner(toggleStatusBtn, 6)

toggleStatusBtn.MouseButton1Click:Connect(function()
    statusVisible = not statusVisible
    statusTable.Visible = statusVisible
    toggleStatusBtn.BackgroundColor3 = statusVisible
        and Color3.fromRGB(30, 30, 45)
        or  Color3.fromRGB(50, 50, 70)
end)

-- ========================================================
-- ③ キルフィード (右上)
-- ========================================================
local KF_W = 240
local KF_MAX = 5
local KF_LIFE = 5.0

local kfFrame = Instance.new("Frame")
kfFrame.Name = "KillFeed"
kfFrame.Size = UDim2.new(0, KF_W, 0, 160)
kfFrame.Position = UDim2.new(1, -(KF_W + 8), 0, TOP_H + 8)
kfFrame.BackgroundTransparency = 1
kfFrame.ClipsDescendants = true
kfFrame.Parent = gui

local kfLayout = Instance.new("UIListLayout")
kfLayout.SortOrder = Enum.SortOrder.LayoutOrder
kfLayout.Padding = UDim.new(0, 3)
kfLayout.Parent = kfFrame

local kfEntries = {}

local WEAPON_ICON = {
    AssaultRifle = "AR",
    Shotgun      = "SG",
    Sniper       = "SR",
    SMG          = "SMG",
}

local function addKill(killer, victim, weapon, headshot)
    if #kfEntries >= KF_MAX then
        kfEntries[1].frame:Destroy()
        table.remove(kfEntries, 1)
    end

    local row = Instance.new("Frame")
    row.Size = UDim2.new(1, 0, 0, 26)
    row.BackgroundColor3 = Color3.fromRGB(14, 14, 22)
    row.BackgroundTransparency = 0.3
    row.LayoutOrder = #kfEntries + 1
    row.Parent = kfFrame
    corner(row, 5)
    row.Position = UDim2.new(1.05, 0, 0, 0)
    tween(row, 0.25, { Position = UDim2.new(0, 0, 0, 0) })

    -- キラー
    label({ text=killer, size=11,
        color=(killer == localPlayer.Name) and Color3.fromRGB(255,220,60) or Color3.fromRGB(180,180,255),
        sz=UDim2.new(0.38,0,1,0), pos=UDim2.new(0,4,0,0),
        xa=Enum.TextXAlignment.Left, parent=row })

    -- 武器 + ヘッドショット
    local wText = (WEAPON_ICON[weapon] or weapon) .. (headshot and "★" or "")
    label({ text=wText, size=9, color=Color3.fromRGB(140,140,180),
        sz=UDim2.new(0.24,0,1,0), pos=UDim2.new(0.38,0,0,0), parent=row })

    -- ビクティム
    label({ text=victim, size=11,
        color=(victim == localPlayer.Name) and Color3.fromRGB(255,80,80) or Color3.fromRGB(160,160,200),
        sz=UDim2.new(0.38,0,1,0), pos=UDim2.new(0.62,0,0,0),
        xa=Enum.TextXAlignment.Left, parent=row })

    table.insert(kfEntries, { frame = row })

    task.delay(KF_LIFE, function()
        if not row.Parent then return end
        tween(row, 0.4, { BackgroundTransparency = 1,
            Size = UDim2.new(1, 0, 0, 0) })
        for _, c in ipairs(row:GetChildren()) do
            if c:IsA("TextLabel") then
                tween(c, 0.4, { TextTransparency = 1 })
            end
        end
        task.wait(0.5)
        row:Destroy()
        for i, e in ipairs(kfEntries) do
            if e.frame == row then table.remove(kfEntries, i); break end
        end
    end)
end

-- ========================================================
-- ④ 中央バナー (試合開始・終了)
-- ========================================================
local banner = Instance.new("Frame")
banner.Name = "Banner"
banner.Size = UDim2.new(0, 480, 0, 90)
banner.Position = UDim2.new(0.5, -240, 0, -100)  -- 初期は画面外 (上)
banner.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
banner.BackgroundTransparency = 0.1
banner.Parent = gui
corner(banner, 14)

local bannerSub = label({ text="", size=13, color=Color3.fromRGB(160,160,220),
    sz=UDim2.new(1,0,0,26), pos=UDim2.new(0,0,0,4), parent=banner })

local bannerMain = label({ text="", size=44, color=Color3.fromRGB(255,255,255),
    sz=UDim2.new(1,0,0,58), pos=UDim2.new(0,0,0,28), parent=banner })

-- ラインデコ
local lineL = Instance.new("Frame")
lineL.Size = UDim2.new(0,0,0,2); lineL.Position = UDim2.new(0.5,0,0.5,0)
lineL.BackgroundColor3 = Color3.fromRGB(255,220,60); lineL.Parent = banner

local lineR = Instance.new("Frame")
lineR.Size = UDim2.new(0,0,0,2); lineR.Position = UDim2.new(0.5,0,0.5,0)
lineR.BackgroundColor3 = Color3.fromRGB(255,220,60); lineR.Parent = banner

local function showBanner(sub, main, color, duration)
    bannerSub.Text = sub
    bannerMain.Text = main
    bannerMain.TextColor3 = color or Color3.fromRGB(255,255,255)

    -- 上からスライドイン
    banner.Position = UDim2.new(0.5,-240,0,-100)
    tween(banner, 0.4, { Position = UDim2.new(0.5,-240,0,TOP_H + 20) })
    tween(lineL, 0.5, { Size=UDim2.new(0,200,0,2), Position=UDim2.new(0.5,-200,0.5,0) })
    tween(lineR, 0.5, { Size=UDim2.new(0,200,0,2), Position=UDim2.new(0.5,0,0.5,0) })

    task.delay(duration or 3.0, function()
        tween(banner, 0.4, { Position = UDim2.new(0.5,-240,0,-100) })
        tween(lineL, 0.3, { Size=UDim2.new(0,0,0,2), Position=UDim2.new(0.5,0,0.5,0) })
        tween(lineR, 0.3, { Size=UDim2.new(0,0,0,2), Position=UDim2.new(0.5,0,0.5,0) })
    end)
end

-- ========================================================
-- Remote 受信
-- ========================================================
KillFeed.OnClientEvent:Connect(addKill)

TimerUpdate.OnClientEvent:Connect(function(sec)
    local m = math.floor(sec / 60)
    local s = sec % 60
    timerLabel.Text = string.format("%d:%02d", m, s)
    if sec <= 10 then
        timerLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
        tween(timerLabel, 0.2, { TextTransparency = 0.4 })
        task.wait(0.2)
        tween(timerLabel, 0.2, { TextTransparency = 0 })
    else
        timerLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
    end
end)

ScoreUpdate.OnClientEvent:Connect(function(list)
    if #list >= 2 then
        scoreLabel.Text = list[1].kills .. "  :  " .. list[2].kills
        if list[1].name == localPlayer.Name then
            teamALabel.Text = localPlayer.Name
        end
    elseif #list == 1 then
        scoreLabel.Text = list[1].kills .. "  :  0"
    end
end)

LimiterChanged.OnClientEvent:Connect(function(userId, newRatio, stats)
    if userId == localPlayer.UserId then
        currentRatio = newRatio
        updateLimiterVisual(newRatio)
        if stats then updateStatusTable(stats) end
    end
end)

RoundEvent.OnClientEvent:Connect(function(eventType, data)
    if eventType == "ROUND_START" then
        gui.Enabled = true
        roundLabel.Text = "ROUND  " .. (data.round or 1) .. " / " .. (data.maxRounds or 3)
        showBanner("ROUND " .. (data.round or 1), "FIGHT!", Color3.fromRGB(255,220,60), 2.5)

    elseif eventType == "ROUND_END" then
        showBanner((data.winnerName or "?") .. " が勝利", "ROUND END", Color3.fromRGB(180,180,255), 3.0)

    elseif eventType == "MATCH_WIN" then
        showBanner("おめでとう！", "YOU WIN", Color3.fromRGB(255,220,60), 4.0)
        task.delay(5, function() gui.Enabled = false end)

    elseif eventType == "MATCH_LOSE" then
        showBanner("また挑戦しよう", "YOU LOSE", Color3.fromRGB(255, 80, 80), 4.0)
        task.delay(5, function() gui.Enabled = false end)

    elseif eventType == "COUNTDOWN" then
        showBanner("", tostring(data.count or ""), Color3.fromRGB(255,255,255), 0.8)

    elseif eventType == "WAITING" then
        roundLabel.Text = "待機中..."
        timerLabel.Text = "--:--"
    end
end)

-- ========================================================
-- 初期化
-- ========================================================
local initRatio = GetLimiterRatio:InvokeServer()
currentRatio = initRatio
updateLimiterVisual(initRatio)
updateStatusTable(LimiterConfig.calcStats(initRatio))

print("[HUD v2] 起動完了")
