# GitHub Pages 用 — ルートの game.html / js/ が Actions で自動デプロイされます。
# ローカル確認用に _site フォルダへコピー（任意）
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $root '_site'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dest 'js') | Out-Null
Copy-Item (Join-Path $root 'game.html'), (Join-Path $root 'index.html'), (Join-Path $root 'accounts.json') -Destination $dest -Force
Copy-Item (Join-Path $root 'js\*.js') -Destination (Join-Path $dest 'js') -Force
Write-Host "OK: _site フォルダを更新しました（ローカル確認用）"
Write-Host "  python -m http.server 8080  →  http://localhost:8080/game.html"
Get-ChildItem $dest -Recurse -File | Sort-Object FullName | Format-Table @{N='Path';E={$_.FullName.Replace($dest + '\', '')}}, Length
