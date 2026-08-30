-- ranked/server/RankedMatchService.lua
-- ランク戦プレース: テレポートデータを読んで試合を開始し、
-- 終了後はロビーへ戻しランク値を DataStore に書き込む

local Players           = game:GetService("Players")
local TeleportService   = game:GetService("TeleportService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

local PlayerDataService = require(script.Parent:WaitForChild("PlayerDataService"))
local RoundManager      = require(script.Parent:WaitForChild("RoundManager"))

-- ========================================================
-- 設定
-- ★ ロビーの PlaceId を設定する (Studio → ゲームの設定 → 場所)
-- ========================================================
local LOBBY_PLACE_ID = 0   -- ← ロビープレースのPlaceId

-- ========================================================
-- Remotes の準備
-- ========================================================
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then obj = Instance.new(className); obj.Name = name; obj.Parent = parent end
    return obj
end

-- ランク場クライアントへのイベント
local RankedMatch_Update = getOrCreate("RemoteEvent", "RankedMatch_Update", Remotes)

-- ========================================================
-- プレイヤーのテレポートデータを収集して試合を開始
-- ========================================================
local matchData    = nil   -- ロビーから受け取った試合設定
local joinedPlayers = {}   -- [userId] = player
local matchStarted  = false

-- プレイヤーが参加したらテレポートデータを読む
Players.PlayerAdded:Connect(function(player)
    joinedPlayers[player.UserId] = player

    -- 最初のプレイヤーのデータからmatchDataを取得
    if not matchData then
        local joinInfo = player:GetJoinData()
        if joinInfo and joinInfo.TeleportData then
            matchData = joinInfo.TeleportData
        end
    end

    -- 全員が揃ったか確認
    if matchData and not matchStarted then
        -- チーム割り当てにいるプレイヤー数と参加数を比較
        local expectedCount = 0
        for _ in pairs(matchData.teams or {}) do expectedCount += 1 end
        local arrivedCount = 0
        for _ in pairs(joinedPlayers) do arrivedCount += 1 end

        if arrivedCount >= expectedCount and expectedCount > 0 then
            matchStarted = true
            task.delay(1, function()
                startRankedMatch()
            end)
        end
    end
end)

-- 全員が揃わない場合のタイムアウト (60秒)
task.delay(60, function()
    if not matchStarted and matchData then
        matchStarted = true
        warn("[RankedMatchService] タイムアウト: 揃ったプレイヤーで試合開始")
        startRankedMatch()
    elseif not matchData then
        warn("[RankedMatchService] matchData が取得できませんでした")
    end
end)

-- ========================================================
-- 試合開始
-- ========================================================
function startRankedMatch()
    if not matchData then
        warn("[RankedMatchService] matchData なし: 試合開始不可")
        return
    end

    local modeKey  = matchData.mode or "1v1"
    local teams    = matchData.teams or {}      -- { ["userId"] = "A"|"B"|"C" }
    local avgRank  = matchData.avgRank or PlayerData.DEFAULT_RANK_VALUE
    local lobbyId  = matchData.lobbyPlaceId or LOBBY_PLACE_ID

    -- 参加プレイヤーをテーブルに整理
    local activePlayers = {}   -- [userId] = player
    local teamAssign    = {}   -- [userId] = "A"|"B"|"C"

    for userId, player in pairs(joinedPlayers) do
        local uidStr = tostring(userId)
        if teams[uidStr] then
            activePlayers[userId] = player
            teamAssign[userId]    = teams[uidStr]
        end
    end

    -- 全員にマッチ情報を通知
    for _, player in pairs(activePlayers) do
        RankedMatch_Update:FireClient(player, "MATCH_READY", {
            mode           = modeKey,
            teamAssignment = teamAssign[player.UserId],
        })
    end

    -- RoundManager で試合開始 (コールバックでランク反映 + ロビーへ戻す)
    RoundManager.startMatch(modeKey, activePlayers, teamAssign, true,
        function(winnerTeam, finalPlayers, finalTeams)
            -- ランク値を更新して DataStore に書き込む
            for uid, player in pairs(finalPlayers) do
                local myTeam = finalTeams[uid]
                local isWin  = (myTeam == winnerTeam)
                local rp     = PlayerDataService.recordRanked(player, isWin, avgRank)

                RankedMatch_Update:FireClient(player, "RANK_RESULT", {
                    rpChange     = rp,
                    newRankValue = PlayerDataService.getRankValue(player),
                    isWin        = isWin,
                })
            end

            -- 数秒待ってからロビーへテレポート
            task.delay(6, function()
                teleportToLobby(finalPlayers, lobbyId)
            end)
        end
    )
end

-- ========================================================
-- ロビーへテレポート
-- ========================================================
function teleportToLobby(playerTable, lobbyPlaceId)
    local playerList = {}
    for _, p in pairs(playerTable) do
        if p and p.Parent then table.insert(playerList, p) end
    end
    if #playerList == 0 then return end

    local targetId = (lobbyPlaceId and lobbyPlaceId > 0) and lobbyPlaceId or LOBBY_PLACE_ID
    if targetId == 0 then
        warn("[RankedMatchService] LOBBY_PLACE_ID が設定されていません")
        return
    end

    local options = Instance.new("TeleportOptions")
    options:SetTeleportData({ returnFromRanked = true })

    local ok, err = pcall(function()
        TeleportService:TeleportAsync(targetId, playerList, options)
    end)
    if not ok then warn("[RankedMatchService] ロビーへのテレポート失敗:", err) end
end

-- プレイヤーが途中で抜けた場合
Players.PlayerRemoving:Connect(function(player)
    joinedPlayers[player.UserId] = nil
end)

print("[RankedMatchService] 起動完了")
