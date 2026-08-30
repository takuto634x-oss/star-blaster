-- RoundManager.lua (Server)
-- 全滅判定ラウンド管理 (モード対応版)
--
-- ★ 勝利条件: ラウンド中リスポーンなし。チーム全員が死んだら全滅 → 最後の1チームが勝者
-- ★ 3チームモード(1v1v1/2v2v2/3v3v3)では複数チームの全滅順を追跡する
-- ★ マッチは最大3ラウンド、先に2ラウンド勝利したチームが勝者
-- ★ 自動起動しない。MatchmakingService.startMatch() から呼び出す。

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- ========================================================
-- Remote の準備
-- ========================================================
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local function getOrCreate(className, name, parent)
    local obj = parent:FindFirstChild(name)
    if not obj then
        obj = Instance.new(className)
        obj.Name = name
        obj.Parent = parent
    end
    return obj
end

local RoundEvent  = getOrCreate("RemoteEvent", "RoundEvent",  Remotes)
local TimerUpdate = getOrCreate("RemoteEvent", "TimerUpdate", Remotes)
local KillFeed    = getOrCreate("RemoteEvent", "KillFeed",    Remotes)

-- ========================================================
-- 設定
-- ========================================================
local MAX_ROUNDS       = 3      -- 最大ラウンド数 (先に2勝したチームが優勝)
local ROUND_DURATION   = 120    -- ラウンド時間上限 (秒) ─ 全滅しない場合の引き分け防止
local COUNTDOWN_FROM   = 3
local BETWEEN_ROUND    = 5
local MIN_PLAYERS      = 2

-- チームカラーラベル
local TEAM_LABEL = { A = "チームA", B = "チームB", C = "チームC" }

-- ========================================================
-- 試合状態
-- ========================================================
local state = {
    phase           = "WAITING",
    round           = 1,
    mode            = "1v1",

    -- 参加者 (試合開始時に MatchmakingService から渡される)
    activePlayers   = {},   -- [userId] = player
    teamAssign      = {},   -- [userId] = "A"|"B"|"C"

    -- ラウンドごとにリセット
    isAlive         = {},   -- [userId] = bool
    aliveInTeam     = {},   -- [teamKey] = alive count
    teamsAlive      = 0,    -- 現在生き残っているチーム数
    elimOrder       = {},   -- 全滅した順: { teamKey, ... }  先頭が最初に全滅

    -- マッチ通算勝利数
    teamRoundWins   = {},   -- [teamKey] = round win count
}

-- ========================================================
-- ユーティリティ
-- ========================================================
local function fireAll(eventName, ...)
    for _, p in pairs(state.activePlayers) do
        RoundEvent:FireClient(p, eventName, ...)
    end
end

local function resetRound()
    state.isAlive     = {}
    state.aliveInTeam = {}
    state.elimOrder   = {}

    -- 参加チームを列挙してカウント初期化
    local teamsInGame = {}
    for userId in pairs(state.activePlayers) do
        local t = state.teamAssign[userId]
        if t then
            state.isAlive[userId]  = true
            state.aliveInTeam[t]   = (state.aliveInTeam[t] or 0) + 1
            teamsInGame[t]         = true
        end
    end
    state.teamsAlive = 0
    for _ in pairs(teamsInGame) do state.teamsAlive += 1 end
end

-- 生き残っているチームを返す (1チームのみのとき勝者)
local function getSurvivorTeam()
    for teamKey, count in pairs(state.aliveInTeam) do
        if count > 0 then return teamKey end
    end
    return nil
end

-- ========================================================
-- 全滅チェック: プレイヤーが死亡したときに呼ぶ
-- ========================================================
local function onPlayerEliminated(deadPlayer)
    if state.phase ~= "PLAYING" then return end
    local uid = deadPlayer.UserId
    if not state.activePlayers[uid] then return end
    if not state.isAlive[uid] then return end   -- 二重呼び出し防止

    state.isAlive[uid] = false

    local teamKey = state.teamAssign[uid]
    if not teamKey then return end

    state.aliveInTeam[teamKey] -= 1

    -- そのチームが全滅した？
    if state.aliveInTeam[teamKey] <= 0 then
        state.aliveInTeam[teamKey] = 0
        table.insert(state.elimOrder, teamKey)
        state.teamsAlive -= 1

        -- 全員に「チームXが全滅」通知
        fireAll("TEAM_ELIMINATED", {
            team      = teamKey,
            teamLabel = TEAM_LABEL[teamKey] or teamKey,
            remaining = state.teamsAlive,
        })

        -- 残り1チームになったらラウンド終了
        if state.teamsAlive <= 1 then
            -- 少し間を置いてからラウンド終了
            task.spawn(function()
                task.wait(1.5)
                if state.phase == "PLAYING" then
                    RoundManager.endRound()
                end
            end)
        end
    end
end

-- ========================================================
-- タイマーループ
-- ========================================================
local function runTimer(seconds, onTick, onFinish)
    local remaining = seconds
    while remaining > 0 and state.phase == "PLAYING" do
        task.wait(1)
        remaining -= 1
        if onTick then onTick(remaining) end
    end
    if state.phase == "PLAYING" and onFinish then onFinish() end
end

-- ========================================================
-- RoundManager
-- ========================================================
local RoundManager = {}

-- onMatchEnd(winnerTeam, activePlayers, teamAssign) コールバック
-- カジュアル/ランクサービスが勝敗をXP/ランクに反映するために使用
function RoundManager.startMatch(modeKey, playerTable, teamAssignments, _isRanked, onMatchEnd)
    state.onMatchEnd    = onMatchEnd
    state.mode          = modeKey or "1v1"
    state.activePlayers = playerTable or {}
    state.teamAssign    = teamAssignments or {}
    state.round         = 1
    state.teamRoundWins = {}

    -- 各チームの勝利数を 0 で初期化
    local seenTeams = {}
    for _, t in pairs(state.teamAssign) do seenTeams[t] = true end
    for t in pairs(seenTeams) do state.teamRoundWins[t] = 0 end

    RoundManager.runRound()
end

function RoundManager.runRound()
    state.phase = "WAITING"

    -- 最低人数チェック
    local count = 0
    for _ in pairs(state.activePlayers) do count += 1 end
    if count < MIN_PLAYERS then
        task.wait(3)
        RoundManager.runRound()
        return
    end

    -- 全員リスポーン (ラウンド開始時のみ)
    for _, p in pairs(state.activePlayers) do
        p:LoadCharacter()
    end
    task.wait(1)

    -- カウントダウン
    state.phase = "COUNTDOWN"
    for i = COUNTDOWN_FROM, 1, -1 do
        fireAll("COUNTDOWN", { count = i })
        task.wait(1)
    end

    -- ラウンド開始
    state.phase = "PLAYING"
    resetRound()

    -- 各プレイヤーに自分のチームを通知
    for userId, p in pairs(state.activePlayers) do
        RoundEvent:FireClient(p, "ROUND_START", {
            round          = state.round,
            maxRounds      = MAX_ROUNDS,
            mode           = state.mode,
            teamAssignment = state.teamAssign[userId],
            teamLabel      = TEAM_LABEL[state.teamAssign[userId]] or "?",
        })
    end

    -- タイマー (全滅しない場合の上限)
    runTimer(ROUND_DURATION, function(remaining)
        for _, p in pairs(state.activePlayers) do
            TimerUpdate:FireClient(p, remaining)
        end
    end, function()
        -- 時間切れ → 生存人数最多チームの勝ち (引き分けなら draw)
        if state.phase == "PLAYING" then
            RoundManager.endRound()
        end
    end)
end

function RoundManager.endRound()
    if state.phase == "ROUND_END" then return end
    state.phase = "ROUND_END"

    -- 勝者チームを決定
    local winnerTeam = getSurvivorTeam()

    -- 生存チームが複数いる場合(時間切れ引き分け): 生存者数最多チームを探す
    if not winnerTeam then
        local maxAlive, candidates = 0, {}
        for teamKey, cnt in pairs(state.aliveInTeam) do
            if cnt > maxAlive then
                maxAlive   = cnt
                candidates = { teamKey }
            elseif cnt == maxAlive then
                table.insert(candidates, teamKey)
            end
        end
        if #candidates == 1 then
            winnerTeam = candidates[1]
        end
        -- 候補が複数 = 完全引き分け → winnerTeam = nil
    end

    local winnerLabel = winnerTeam and (TEAM_LABEL[winnerTeam] or winnerTeam) or "引き分け"

    -- ラウンド勝利カウント
    if winnerTeam then
        state.teamRoundWins[winnerTeam] = (state.teamRoundWins[winnerTeam] or 0) + 1
    end

    fireAll("ROUND_END", {
        winnerTeam  = winnerTeam,
        winnerLabel = winnerLabel,
        roundWins   = state.teamRoundWins,
    })

    -- 先に2勝したチームがいたらマッチ終了
    if winnerTeam and state.teamRoundWins[winnerTeam] >= 2 then
        task.wait(2)
        RoundManager.endMatch(winnerTeam)
        return
    end

    -- 全ラウンド消化でもマッチ終了
    if state.round >= MAX_ROUNDS then
        task.wait(2)
        -- 最多勝利チームを総合勝者に
        local topTeam, topWins = nil, -1
        for teamKey, wins in pairs(state.teamRoundWins) do
            if wins > topWins then topWins = wins; topTeam = teamKey end
        end
        RoundManager.endMatch(topTeam)
        return
    end

    state.round += 1
    task.wait(BETWEEN_ROUND)
    RoundManager.runRound()
end

function RoundManager.endMatch(winnerTeam)
    local winnerLabel = winnerTeam and (TEAM_LABEL[winnerTeam] or winnerTeam) or "引き分け"

    for userId, player in pairs(state.activePlayers) do
        local myTeam = state.teamAssign[userId]
        if myTeam == winnerTeam then
            RoundEvent:FireClient(player, "MATCH_WIN",  { winnerLabel = winnerLabel })
        else
            RoundEvent:FireClient(player, "MATCH_LOSE", { winnerLabel = winnerLabel })
        end
    end

    -- コールバック: カジュアルXP / ランク値を更新
    if state.onMatchEnd then
        state.onMatchEnd(winnerTeam, state.activePlayers, state.teamAssign)
    end

    task.wait(5)
    state.activePlayers = {}
    state.teamAssign    = {}
    state.onMatchEnd    = nil
    state.phase         = "WAITING"
end

-- ========================================================
-- キル通知 (GameManager から呼ぶ → キルフィード用)
-- キル数での勝敗判定は行わない
-- ========================================================
function RoundManager.onKill(killerPlayer)
    -- キルフィード表示のためだけに利用
    -- 勝敗は onPlayerEliminated で管理
end

-- ========================================================
-- Humanoid.Died フック
-- CharacterAdded ごとに接続し直すので毎ラウンド自動で動く
-- ========================================================
local function hookCharacter(player, character)
    local humanoid = character:WaitForChild("Humanoid", 10)
    if not humanoid then return end
    humanoid.Died:Connect(function()
        onPlayerEliminated(player)
    end)
end

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        hookCharacter(player, character)
    end)
    if player.Character then
        hookCharacter(player, player.Character)
    end
end)

-- Studio テスト: 既に存在するプレイヤーにも適用
for _, player in ipairs(Players:GetPlayers()) do
    player.CharacterAdded:Connect(function(character)
        hookCharacter(player, character)
    end)
    if player.Character then
        hookCharacter(player, player.Character)
    end
end

print("[RoundManager] 起動完了 (全滅判定・7モード対応)")

return RoundManager
