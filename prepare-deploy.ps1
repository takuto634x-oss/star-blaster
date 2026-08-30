# Netlify にアップロードする前に実行 → deploy フォルダにコピー
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $root 'deploy'
$jsDest = Join-Path $dest 'js'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
New-Item -ItemType Directory -Force -Path $jsDest | Out-Null
Copy-Item (Join-Path $root 'game.html'), (Join-Path $root 'index.html'), (Join-Path $root 'accounts.json') -Destination $dest -Force
Copy-Item (Join-Path $root 'js\*.js') -Destination $jsDest -Force
Write-Host "OK: deploy フォルダを更新しました"
Get-ChildItem $dest -Recurse -File | Sort-Object FullName | Format-Table @{N='Path';E={$_.FullName.Replace($dest + '\', '')}}, Length
