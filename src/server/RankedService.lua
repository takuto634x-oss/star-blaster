-- RankedService.lua (Server) ── ロビー側ランク戦サービス
-- マッチングが成立したら専用ランク場プレースへ TeleportService でテレポートさせる
-- ★ 実際の試合ロジックは ranked プレース側の RankedMatchService.lua が担う

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TeleportService   = game:GetService("TeleportService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))
local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))

-- ========================================================
-- ★ ここに Roblox Studio で確認したPlaceIdを設定する
-- ========================================================
-- 手順: Studio → [ホーム] → [ゲームの設定] → [場所] タブ
--       "ranked-match" という名前の場所を追加して PlaceId をメモ
local RANKED_PLACE_ID = 0   -- ← ランク戦プレースのPlaceId
local LOBBY_PLACE_ID  = game.PlaceId  -- このロビーのPlaceId (自動取得)

-- ========================================================
-- モード定義
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
local ACCEPT_TIMEOUT = 15
local SCAN_INTERVAL  = 5
local TEAM_KEYS      = { "A", "B", "C" }

-- ========================================================
-- Remotes
-- ========================================================
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then obj = Instance.new(className); obj.Name = name; obj.Parent = parent end
    return obj
end

local Ranked_Join        = getOrCreate("RemoteEvent",  "Ranked_Join",        Remotes)
local Ranked_Leave       = getOrCreate("RemoteEvent",  "Ranked_Leave",       Remotes)
local Ranked_Accept      = getOrCreate("RemoteEvent",  "Ranked_Accept",      Remotes)
local Ranked_StateUpdate = getOrCreate("RemoteEvent",  "Ranked_StateUpdate", Remotes)

-- ========================================================
-- キュー状態
-- ========================================================
local queues      = {}   -- queues[modeKey][userId] = { player, rankValue, joinedAt }
local matchGroups = {}   -- matchGroups[groupId] = { players, accepted, deadline, modeKey }
local playerMode  = {}   -- [userId] = modeKey
local playerGroup = {}   -- [userId] = groupId (FOUND中のみ)

for modeKey in pairs(MODES) do queues[modeKey] = {} end

local groupIdCounter = 0
local function newGroupId() groupIdCounter += 1; return groupIdCounter end

-- ========================================================
-- ユーティリティ
-- ========================================================
local function removeFromQueue(player)
    local modeKey = playerMode[player.UserId]
    if not modeKey then return end
    queues[modeKey][player.UserId] = nil
    playerMode[player.UserId]      = nil
end

local function assignTeams(playerList, teamsCount, teamSize)
    for i = #playerList, 2, -1 do
        local j = math.random(i); playerList[i], playerList[j] = playerList[j], playerList[i]
    end
    local assignments = {}
    for i, p in ipairs(playerList) do
        assignments[tostring(p.UserId)] = TEAM_KEYS[math.ceil(i / teamSize)]
    end
    return assignments
end

-- ========================================================
-- FOUND フェーズ
-- ========================================================
local function enterFound(modeKey, playerList)
    local gid      = newGroupId()
    local deadline = tick() + ACCEPT_TIMEOUT
    local group    = { players = {}, accepted = {}, deadline = deadline, modeKey = modeKey }

    local names = {}
    for _, p in ipairs(playerList) do
        group.players[p.UserId] = p
        playerGroup[p.UserId]   = gid
        table.insert(names, p.Name)
    end
    matchGroups[gid] = group

    for _, p in ipairs(playerList) do
        Ranked_StateUpdate:FireClient(p, "FOUND", {
            mode=modeKey, modeLabel=MODES[modeKey].label,
            players=names, acceptDeadline=deadline, groupId=gid,
        })
    end

    -- タイムアウト処理
    task.spawn(function()
        task.wait(ACCEPT_TIMEOUT)
        local g = matchGroups[gid]
        if not g then return end

        for uid, p in pairs(g.players) do
            if not g.accepted[uid] then
                g.players[uid]   = nil
                playerGroup[uid] = nil
                Ranked_StateUpdate:FireClient(p, "LOBBY", {})
            end
        end
        matchGroups[gid] = nil

        -- 残ったプレイヤーをキューに戻す
        for uid, p in pairs(g.players) do
            local rv = PlayerDataService.getRankValue(p)
            queues[modeKey][uid] = { player=p, rankValue=rv, joinedAt=tick() }
            playerMode[uid]      = modeKey
            playerGroup[uid]     = nil
            Ranked_StateUpdate:FireClient(p, "SEARCHING", {
                mode=modeKey, modeLabel=MODES[modeKey].label,
                rankValue=rv, searchRange=PlayerData.searchRange(0),
            })
        end
    end)
end

-- ========================================================
-- ★ マッチ開始 → ランク場プレースへテレポート
-- ========================================================
local function launchRankedMatch(gid)
    local g = matchGroups[gid]
    if not g then return end

    local modeKey = g.modeKey
    local md      = MODES[modeKey]
    matchGroups[gid] = nil

    -- PLAYING 通知 (ローディング演出用)
    for _, p in pairs(g.players) do
        playerGroup[p.UserId] = nil
        Ranked_StateUpdate:FireClient(p, "TELEPORTING", { mode = modeKey })
    end

    -- プレイヤーリスト・チーム割り当て
    local playerList = {}
    for _, p in pairs(g.players) do table.insert(playerList, p) end
    local teamAssignments = assignTeams(playerList, md.teamsCount, md.teamSize)

    -- 平均ランク値
    local rankSum, count = 0, 0
    for _, p in ipairs(playerList) do
        rankSum += PlayerDataService.getRankValue(p); count += 1
    end
    local avgRank = count > 0 and math.floor(rankSum / count) or PlayerData.DEFAULT_RANK_VALUE

    -- ランク場への転送データ (全員が同じデータを受け取る)
    local matchData = {
        mode            = modeKey,
        teams           = teamAssignments,   -- { ["userId"] = "A"|"B"|"C" }
        avgRank         = avgRank,
        lobbyPlaceId    = LOBBY_PLACE_ID,
    }

    -- PlaceId が未設定の場合はエラーで終了
    if RANKED_PLACE_ID == 0 then
        warn("[RankedService] RANKED_PLACE_ID が設定されていません！ranked.project.json の PlaceId を確認してください")
        for _, p in pairs(g.players) do
            Ranked_StateUpdate:FireClient(p, "LOBBY", { error = "PLACE_NOT_CONFIGURED" })
        end
        return
    end

    -- プライベートサーバーを予約して全員テレポート
    task.spawn(function()
        local ok, result = pcall(function()
            return TeleportService:ReserveServer(RANKED_PLACE_ID)
        end)

        if not ok then
            warn("[RankedService] サーバー予約失敗:", result)
            for _, p in pairs(g.players) do
                Ranked_StateUpdate:FireClient(p, "LOBBY", { error = "RESERVE_FAILED" })
            end
            return
        end

        local serverCode = result
        local options    = Instance.new("TeleportOptions")
        options.ReservedServerAccessCode = serverCode
        options:SetTeleportData(matchData)

        local ok2, err = pcall(function()
            TeleportService:TeleportAsync(RANKED_PLACE_ID, playerList, options)
        end)

        if not ok2 then
            warn("[RankedService] テレポート失敗:", err)
            for _, p in pairs(g.players) do
                Ranked_StateUpdate:FireClient(p, "LOBBY", { error = "TELEPORT_FAILED" })
            end
        end
    end)
end

-- ========================================================
-- 定期キュースキャン
-- ========================================================
task.spawn(function()
    while true do
        task.wait(SCAN_INTERVAL)
        for modeKey, queue in pairs(queues) do
            local needed = MODES[modeKey].totalPlayers
            local entries = {}
            for _, e in pairs(queue) do table.insert(entries, e) end
            if #entries < needed then continue end

            table.sort(entries, function(a, b) return a.rankValue < b.rankValue end)

            local i = 1
            while i <= #entries - needed + 1 do
                local window = {}
                for j = i, #entries do
                    local waitSec = tick() - entries[j].joinedAt
                    local range   = PlayerData.searchRange(waitSec)
                    if entries[j].rankValue - entries[i].rankValue <= range then
                        table.insert(window, entries[j])
                        if #window >= needed then break end
                    else
                        break
                    end
                end

                if #window >= needed then
                    local group = {}
                    for k = 1, needed do table.insert(group, window[k].player) end
                    for _, p in ipairs(group) do
                        queues[modeKey][p.UserId] = nil
                        playerMode[p.UserId]      = nil
                    end
                    enterFound(modeKey, group)
                    -- リスト再構築
                    entries = {}
                    for _, e in pairs(queues[modeKey]) do table.insert(entries, e) end
                    table.sort(entries, function(a, b) return a.rankValue < b.rankValue end)
                    i = 1
                else
                    i += 1
                end
            end

            -- 待機中のプレイヤーに検索範囲を通知
            for _, e in pairs(queue) do
                local waitSec = tick() - e.joinedAt
                Ranked_StateUpdate:FireClient(e.player, "SEARCHING", {
                    mode=modeKey, modeLabel=MODES[modeKey].label,
                    rankValue=e.rankValue, searchRange=PlayerData.searchRange(waitSec),
                    waitSec=math.floor(waitSec),
                })
            end
        end
    end
end)

-- ========================================================
-- Remote ハンドラ
-- ========================================================
Ranked_Join.OnServerEvent:Connect(function(player, modeKey)
    if not MODES[modeKey] then modeKey = "1v1" end
    if playerMode[player.UserId] then removeFromQueue(player) end
    local rv = PlayerDataService.getRankValue(player)
    queues[modeKey][player.UserId] = { player=player, rankValue=rv, joinedAt=tick() }
    playerMode[player.UserId]      = modeKey
    Ranked_StateUpdate:FireClient(player, "SEARCHING", {
        mode=modeKey, modeLabel=MODES[modeKey].label,
        rankValue=rv, searchRange=PlayerData.searchRange(0),
    })
end)

Ranked_Leave.OnServerEvent:Connect(function(player)
    local gid = playerGroup[player.UserId]
    if gid then
        local g = matchGroups[gid]
        if g then
            for uid, p in pairs(g.players) do
                playerGroup[uid] = nil
                if uid ~= player.UserId then Ranked_StateUpdate:FireClient(p, "LOBBY", {}) end
            end
            matchGroups[gid] = nil
        end
        playerGroup[player.UserId] = nil
    else
        removeFromQueue(player)
    end
    Ranked_StateUpdate:FireClient(player, "LOBBY", {})
end)

Ranked_Accept.OnServerEvent:Connect(function(player)
    local gid = playerGroup[player.UserId]
    if not gid then return end
    local g = matchGroups[gid]
    if not g then return end

    g.accepted[player.UserId] = true

    local allAccepted = true
    for uid in pairs(g.players) do
        if not g.accepted[uid] then allAccepted = false; break end
    end

    if allAccepted then
        for _, p in pairs(g.players) do
            Ranked_StateUpdate:FireClient(p, "ACCEPTED", { countdown = 3 })
        end
        task.spawn(function()
            task.wait(3)
            launchRankedMatch(gid)
        end)
    end
end)

Players.PlayerRemoving:Connect(function(player)
    local gid = playerGroup[player.UserId]
    if gid then
        local g = matchGroups[gid]
        if g then
            for uid, p in pairs(g.players) do
                playerGroup[uid] = nil
                if uid ~= player.UserId then Ranked_StateUpdate:FireClient(p, "LOBBY", {}) end
            end
            matchGroups[gid] = nil
        end
    else
        removeFromQueue(player)
    end
    playerGroup[player.UserId] = nil
end)

print("[RankedService] 起動完了 (テレポート版)")

return {}
