-- PlayerDataService.lua (Server)
-- プレイヤーごとのレベル・ランク値を管理する
-- ★ DataStore でプレース間のデータを永続化する (ロビー/ランク場で共有)

local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local DataStoreService    = game:GetService("DataStoreService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local PlayerData = require(Shared:WaitForChild("PlayerData"))

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

-- クライアント → サーバー: 自分のデータを問い合わせ
local GetPlayerData = getOrCreate("RemoteFunction", "GetPlayerData", Remotes)
-- サーバー → クライアント: データ更新通知
local PlayerDataUpdated = getOrCreate("RemoteEvent", "PlayerDataUpdated", Remotes)

-- ========================================================
-- DataStore (プレース間で共有)
-- ========================================================
-- ★ Studio でテストする場合: [ホーム] → [ゲームの設定] → [セキュリティ] →
--    「Studio の API サービスへのアクセスを有効にする」をONにする
local playerStore = nil
local ok, err = pcall(function()
    playerStore = DataStoreService:GetDataStore("TheLimiterPlayerData_v1")
end)
if not ok then
    warn("[PlayerDataService] DataStore 初期化失敗 (Studio API 未有効?):", err)
end

-- インメモリキャッシュ
local store    = {}
local saving   = {}   -- 保存中フラグ (二重保存防止)

local function defaultData()
    return {
        xp           = 0,
        rankValue    = PlayerData.DEFAULT_RANK_VALUE,
        wins         = 0,
        losses       = 0,
        rankedWins   = 0,
        rankedLosses = 0,
    }
end

-- DataStore からロード (失敗時はデフォルト)
local function loadFromStore(userId)
    if not playerStore then return defaultData() end
    local ok2, result = pcall(function()
        return playerStore:GetAsync("player_" .. userId)
    end)
    if ok2 and result then
        -- デフォルト値で補完 (古いデータとの互換性)
        local d = defaultData()
        for k, v in pairs(result) do d[k] = v end
        return d
    end
    return defaultData()
end

-- DataStore へ保存 (非同期・リトライ付き)
local function saveToStore(userId, data)
    if not playerStore then return end
    if saving[userId] then return end
    saving[userId] = true
    task.spawn(function()
        local retries = 3
        for i = 1, retries do
            local ok3 = pcall(function()
                playerStore:SetAsync("player_" .. userId, {
                    xp           = data.xp,
                    rankValue    = data.rankValue,
                    wins         = data.wins,
                    losses       = data.losses,
                    rankedWins   = data.rankedWins,
                    rankedLosses = data.rankedLosses,
                })
            end)
            if ok3 then break end
            if i < retries then task.wait(2) end
        end
        saving[userId] = false
    end)
end

local function ensureData(player)
    if not store[player.UserId] then
        store[player.UserId] = loadFromStore(player.UserId)
    end
    return store[player.UserId]
end

-- ========================================================
-- 公開 API
-- ========================================================
local PlayerDataService = {}

function PlayerDataService.getData(player)
    local d   = ensureData(player)
    local lv  = PlayerData.levelFromXp(d.xp)
    local tier = PlayerData.getTier(d.rankValue)
    return {
        xp           = d.xp,
        level        = lv,
        bracket      = PlayerData.levelBracket(lv),
        bracketLabel = PlayerData.bracketLabel(PlayerData.levelBracket(lv)),
        rankValue    = d.rankValue,
        tierName     = tier.name,
        wins         = d.wins,
        losses       = d.losses,
        rankedWins   = d.rankedWins,
        rankedLosses = d.rankedLosses,
    }
end

-- カジュアルゲーム結果を記録 (win=true/false)
function PlayerDataService.recordCasual(player, isWin)
    local d = ensureData(player)
    d.xp += 100
    if isWin then d.wins += 1 else d.losses += 1 end
    PlayerDataUpdated:FireClient(player, PlayerDataService.getData(player))
end

-- ランク戦結果を記録
-- opponentAvgRank: 対戦相手の平均ランク値
function PlayerDataService.recordRanked(player, isWin, opponentAvgRank)
    local d    = ensureData(player)
    local rp   = PlayerData.calcRpChange(d.rankValue, opponentAvgRank or d.rankValue, isWin)
    d.rankValue = math.max(0, d.rankValue + rp)
    if isWin then d.rankedWins += 1 else d.rankedLosses += 1 end

    saveToStore(player.UserId, d)

    PlayerDataUpdated:FireClient(player, PlayerDataService.getData(player))
    return rp  -- 変動値を返す (UIに表示用)
end

function PlayerDataService.getRankValue(player)
    return ensureData(player).rankValue
end

function PlayerDataService.getLevelBracket(player)
    local d  = ensureData(player)
    local lv = PlayerData.levelFromXp(d.xp)
    return PlayerData.levelBracket(lv)
end

-- ========================================================
-- Remote ハンドラ
-- ========================================================
GetPlayerData.OnServerInvoke = function(player)
    return PlayerDataService.getData(player)
end

-- ========================================================
-- プレイヤーイベント
-- ========================================================
Players.PlayerAdded:Connect(function(player)
    ensureData(player)
end)

Players.PlayerRemoving:Connect(function(player)
    -- 退室時に保存してからキャッシュを解放
    local d = store[player.UserId]
    if d then
        saveToStore(player.UserId, d)
        -- 保存完了を少し待つ (テレポート直前のデータ欠損防止)
        task.delay(3, function()
            store[player.UserId] = nil
        end)
    end
end)

-- ゲームシャットダウン時に全員分を強制保存
game:BindToClose(function()
    for userId, d in pairs(store) do
        if playerStore then
            pcall(function()
                playerStore:SetAsync("player_" .. userId, d)
            end)
        end
    end
end)

for _, p in ipairs(Players:GetPlayers()) do
    ensureData(p)
end

print("[PlayerDataService] 起動完了")

return PlayerDataService
