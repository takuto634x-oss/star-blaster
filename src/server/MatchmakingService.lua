-- MatchmakingService.lua (Server) ── カジュアルロビー
-- レベルブラケット×モードの組み合わせでキューを分ける
-- Remote prefix: MM_

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

-- PlayerDataService は同一 Script の兄弟 (init.server.lua 経由でロード済み前提)
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))

-- ========================================================
-- モード定義 (カジュアルで使える全モード)
-- ========================================================
local MODES = {
    ["1v1"]   = { label="1 v 1",   teamsCount=2, teamSize=1 },
    ["2v2"]   = { label="2 v 2",   teamsCount=2, teamSize=2 },
    ["3v3"]   = { label="3 v 3",   teamsCount=2, teamSize=3 },
    ["5v5"]   = { label="5 v 5",   teamsCount=2, teamSize=5 },
    ["1v1v1"] = { label="1v1v1",   teamsCount=3, teamSize=1 },
    ["2v2v2"] = { label="2v2v2",   teamsCount=3, teamSize=2 },
    ["3v3v3"] = { label="3v3v3",   teamsCount=3, teamSize=3 },
}
for _, md in pairs(MODES) do md.totalPlayers = md.teamsCount * md.teamSize end

-- ========================================================
-- 設定
-- ========================================================
local ACCEPT_TIMEOUT         = 15
local ONLINE_UPDATE_INTERVAL = 5
-- ブラケット許容差: 自分のブラケット ±BRACKET_TOLERANCE まで混在OK
local BRACKET_TOLERANCE      = 1

local TEAM_KEYS = { "A", "B", "C" }

-- ========================================================
-- Remote の準備
-- ========================================================
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then obj = Instance.new(className); obj.Name = name; obj.Parent = parent end
    return obj
end

local MM_JoinQueue   = getOrCreate("RemoteEvent",  "MM_JoinQueue",   Remotes)
local MM_LeaveQueue  = getOrCreate("RemoteEvent",  "MM_LeaveQueue",  Remotes)
local MM_Accept      = getOrCreate("RemoteEvent",  "MM_Accept",      Remotes)
local MM_StateUpdate = getOrCreate("RemoteEvent",  "MM_StateUpdate", Remotes)

-- ========================================================
-- キュー状態
-- キーは modeKey (ブラケットは許容差でゆるくマッチ)
-- ========================================================
local queues     = {}   -- queues[modeKey][userId] = { player, bracket }
local accepted   = {}
local phases     = {}
local playerMode = {}   -- [userId] = modeKey

for modeKey in pairs(MODES) do
    queues[modeKey]   = {}
    accepted[modeKey] = {}
    phases[modeKey]   = "IDLE"
end

-- ========================================================
-- ユーティリティ
-- ========================================================
local function queueSize(modeKey)
    local n = 0; for _ in pairs(queues[modeKey]) do n += 1 end; return n
end

local function broadcastToQueue(modeKey, ph, data)
    for _, entry in pairs(queues[modeKey]) do
        MM_StateUpdate:FireClient(entry.player, ph, data)
    end
end

local function removeFromQueue(player)
    local modeKey = playerMode[player.UserId]
    if not modeKey then return end
    queues[modeKey][player.UserId]   = nil
    accepted[modeKey][player.UserId] = nil
    playerMode[player.UserId]        = nil
end

local function assignTeams(playerList, teamsCount, teamSize)
    for i = #playerList, 2, -1 do
        local j = math.random(i); playerList[i], playerList[j] = playerList[j], playerList[i]
    end
    local assignments = {}
    for i, p in ipairs(playerList) do
        assignments[p.UserId] = TEAM_KEYS[math.ceil(i / teamSize)]
    end
    return assignments
end

-- キュー内のプレイヤーが「ブラケット的に近いか」確認
local function isBracketCompatible(bracketA, bracketB)
    return math.abs(bracketA - bracketB) <= BRACKET_TOLERANCE
end

-- キューの先頭グループ(互いにブラケット互換)を抽出して needed 人集める
local function tryFormGroup(modeKey, needed)
    local entries = {}
    for _, e in pairs(queues[modeKey]) do table.insert(entries, e) end
    if #entries < needed then return nil end

    -- ブラケット中央値の近い順に並べ直す
    table.sort(entries, function(a, b) return a.bracket < b.bracket end)

    -- スライディングウィンドウ: 連続する needed 人のブラケット差が許容内か
    for i = 1, #entries - needed + 1 do
        local lo, hi = entries[i].bracket, entries[i + needed - 1].bracket
        if hi - lo <= BRACKET_TOLERANCE * 2 then
            local group = {}
            for j = i, i + needed - 1 do table.insert(group, entries[j].player) end
            return group
        end
    end
    return nil
end

-- ========================================================
-- フェーズ遷移
-- ========================================================
local MatchmakingService = {}

function MatchmakingService.enterFound(modeKey)
    phases[modeKey]   = "FOUND"
    accepted[modeKey] = {}
    local deadline    = tick() + ACCEPT_TIMEOUT
    local md          = MODES[modeKey]

    local names = {}
    for _, e in pairs(queues[modeKey]) do table.insert(names, e.player.Name) end

    broadcastToQueue(modeKey, "FOUND", {
        mode = modeKey, modeLabel = md.label,
        players = names, acceptDeadline = deadline,
    })

    task.spawn(function()
        task.wait(ACCEPT_TIMEOUT)
        if phases[modeKey] ~= "FOUND" then return end
        for userId, entry in pairs(queues[modeKey]) do
            if not accepted[modeKey][userId] then
                queues[modeKey][userId] = nil
                playerMode[userId]      = nil
                MM_StateUpdate:FireClient(entry.player, "LOBBY", {})
            end
        end
        local cur = queueSize(modeKey)
        if cur >= md.totalPlayers then
            MatchmakingService.enterFound(modeKey)
        elseif cur > 0 then
            phases[modeKey] = "SEARCHING"
            broadcastToQueue(modeKey, "SEARCHING", {
                mode=modeKey, modeLabel=md.label, current=cur, needed=md.totalPlayers,
            })
        else
            phases[modeKey] = "IDLE"
        end
    end)
end

function MatchmakingService.startMatch(modeKey)
    phases[modeKey] = "PLAYING"
    broadcastToQueue(modeKey, "START", { mode = modeKey })

    local md         = MODES[modeKey]
    local playerList = {}
    for _, e in pairs(queues[modeKey]) do table.insert(playerList, e.player) end
    local teamAssignments = assignTeams(playerList, md.teamsCount, md.teamSize)

    local ok, RoundManager = pcall(require, script.Parent:WaitForChild("RoundManager"))
    if ok and RoundManager then
        task.spawn(function()
            RoundManager.startMatch(modeKey, queues[modeKey] and (function()
                local t={}; for uid,e in pairs(queues[modeKey]) do t[uid]=e.player end; return t
            end)() or {}, teamAssignments, false,
            -- カジュアル: 勝敗をレベルXPに反映
            function(winnerTeam, activePlayers, teamAssign)
                for uid, p in pairs(activePlayers) do
                    local myTeam = teamAssign[uid]
                    PlayerDataService.recordCasual(p, myTeam == winnerTeam)
                end
            end)
        end)
    end

    queues[modeKey]   = {}
    accepted[modeKey] = {}
end

-- ========================================================
-- Remote ハンドラ
-- ========================================================
MM_JoinQueue.OnServerEvent:Connect(function(player, modeKey)
    if not MODES[modeKey] then modeKey = "1v1" end
    if playerMode[player.UserId] then removeFromQueue(player) end
    if phases[modeKey] == "PLAYING" then
        MM_StateUpdate:FireClient(player, "LOBBY", { onlineCount = #Players:GetPlayers() })
        return
    end

    local bracket = PlayerDataService.getLevelBracket(player)
    local md      = MODES[modeKey]

    queues[modeKey][player.UserId] = { player = player, bracket = bracket }
    playerMode[player.UserId]      = modeKey
    phases[modeKey] = "SEARCHING"

    local cur    = queueSize(modeKey)
    local needed = md.totalPlayers

    broadcastToQueue(modeKey, "SEARCHING", {
        mode=modeKey, modeLabel=md.label, current=cur, needed=needed,
    })

    -- ブラケット互換グループが揃ったか試みる
    local group = tryFormGroup(modeKey, needed)
    if group then
        -- 余剰プレイヤーをキューから外してFOUNDへ
        local inGroup = {}
        for _, p in ipairs(group) do inGroup[p.UserId] = true end
        for uid, entry in pairs(queues[modeKey]) do
            if not inGroup[uid] then
                queues[modeKey][uid] = nil
                playerMode[uid] = nil
                MM_StateUpdate:FireClient(entry.player, "SEARCHING", {
                    mode=modeKey, modeLabel=md.label, current=0, needed=needed,
                })
                -- 再キュー登録
                queues[modeKey][uid] = entry
                playerMode[uid] = modeKey
            end
        end
        -- group のみ FOUND へ
        local tempQueue = {}
        for _, p in ipairs(group) do
            tempQueue[p.UserId] = queues[modeKey][p.UserId]
        end
        queues[modeKey] = tempQueue
        MatchmakingService.enterFound(modeKey)
    end
end)

MM_LeaveQueue.OnServerEvent:Connect(function(player)
    local modeKey = playerMode[player.UserId]
    if not modeKey then return end
    local wasFound = (phases[modeKey] == "FOUND")
    removeFromQueue(player)
    MM_StateUpdate:FireClient(player, "LOBBY", { onlineCount = #Players:GetPlayers() })
    local cur = queueSize(modeKey)
    if wasFound then
        phases[modeKey]   = "SEARCHING"
        accepted[modeKey] = {}
    end
    if cur == 0 then phases[modeKey] = "IDLE"
    else
        broadcastToQueue(modeKey, "SEARCHING", {
            mode=modeKey, modeLabel=MODES[modeKey].label, current=cur, needed=MODES[modeKey].totalPlayers,
        })
    end
end)

MM_Accept.OnServerEvent:Connect(function(player)
    local modeKey = playerMode[player.UserId]
    if not modeKey or phases[modeKey] ~= "FOUND" then return end
    accepted[modeKey][player.UserId] = true
    local allAccepted = true
    for uid in pairs(queues[modeKey]) do
        if not accepted[modeKey][uid] then allAccepted = false; break end
    end
    if allAccepted then
        broadcastToQueue(modeKey, "ACCEPTED", { countdown = 3 })
        task.spawn(function() task.wait(3); MatchmakingService.startMatch(modeKey) end)
    end
end)

Players.PlayerRemoving:Connect(function(player)
    local modeKey = playerMode[player.UserId]
    if not modeKey then return end
    local wasFound = (phases[modeKey] == "FOUND")
    removeFromQueue(player)
    if wasFound then
        phases[modeKey] = "SEARCHING"; accepted[modeKey] = {}
        broadcastToQueue(modeKey, "SEARCHING", {
            mode=modeKey, modeLabel=MODES[modeKey].label,
            current=queueSize(modeKey), needed=MODES[modeKey].totalPlayers,
        })
    end
end)

task.spawn(function()
    while true do
        task.wait(ONLINE_UPDATE_INTERVAL)
        local count = #Players:GetPlayers()
        for _, p in ipairs(Players:GetPlayers()) do
            if not playerMode[p.UserId] then
                MM_StateUpdate:FireClient(p, "LOBBY", { onlineCount = count })
            end
        end
    end
end)

print("[MatchmakingService/Casual] 起動完了")

return MatchmakingService
