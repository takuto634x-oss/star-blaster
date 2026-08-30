-- WeaponController.lua (Client)
-- 武器の射撃入力を処理し、サーバーへ FireWeapon を送信する

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService  = game:GetService("UserInputService")
local RunService        = game:GetService("RunService")

local Shared     = ReplicatedStorage:WaitForChild("Shared")
local WeaponData = require(Shared:WaitForChild("WeaponData"))

local Remotes    = ReplicatedStorage:WaitForChild("Remotes")
local FireWeapon = Remotes:WaitForChild("FireWeapon")

local localPlayer = Players.LocalPlayer
local camera      = workspace.CurrentCamera

-- 現在装備中の武器データ
local equippedWeapon = nil
local lastFireTime   = 0

-- ========== レイキャスト でヒット検出 ==========
local raycastParams = RaycastParams.new()
raycastParams.FilterType = Enum.RaycastFilterType.Exclude

local function getHitResult()
    local char = localPlayer.Character
    if not char then return nil end

    -- 自分のキャラクターを除外
    raycastParams.FilterDescendantsInstances = { char }

    local unitRay = camera:ViewportPointToRay(
        camera.ViewportSize.X / 2,
        camera.ViewportSize.Y / 2
    )
    return workspace:Raycast(unitRay.Origin, unitRay.Direction * 1500, raycastParams)
end

-- ========== 発射処理 ==========
local function tryFire()
    if not equippedWeapon then return end

    local now = tick()
    if now - lastFireTime < equippedWeapon.fireRate then return end
    lastFireTime = now

    local hit = getHitResult()
    if not hit then return end

    -- ヒット先のキャラクターを探す
    local hitPart       = hit.Instance
    local hitCharacter  = hitPart:FindFirstAncestorOfClass("Model")
    if not hitCharacter then return end

    local humanoid = hitCharacter:FindFirstChildOfClass("Humanoid")
    if not humanoid or humanoid.Health <= 0 then return end

    FireWeapon:FireServer(hitCharacter, hitPart.Name, equippedWeapon.toolName)
end

-- ========== 武器装備イベント ==========
local function onCharacterAdded(character)
    character.ChildAdded:Connect(function(child)
        if child:IsA("Tool") then
            local data = WeaponData.getByToolName(child.Name)
            if data then
                equippedWeapon = data
            end
        end
    end)

    character.ChildRemoved:Connect(function(child)
        if child:IsA("Tool") and equippedWeapon and child.Name == equippedWeapon.toolName then
            equippedWeapon = nil
        end
    end)
end

localPlayer.CharacterAdded:Connect(onCharacterAdded)
if localPlayer.Character then
    onCharacterAdded(localPlayer.Character)
end

-- ========== 入力処理 ==========
UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end

    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        if equippedWeapon and not equippedWeapon.isAutomatic then
            tryFire()
        end
    end
end)

-- 自動射撃 (フルオート武器)
RunService.RenderStepped:Connect(function()
    if UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1) then
        if equippedWeapon and equippedWeapon.isAutomatic then
            tryFire()
        end
    end
end)

print("[WeaponController] クライアント起動完了")
