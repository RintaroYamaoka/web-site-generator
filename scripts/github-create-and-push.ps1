# GitHub に web-site-generator リポジトリを作成してプッシュする
# 方法1: 環境変数 GITHUB_TOKEN を設定してこのスクリプトを実行（API で自動作成してプッシュ）
# 方法2: gh auth login でログイン済みの状態で実行（gh で自動作成してプッシュ）

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$owner = "RintaroYamaoka"
$repoName = "web-site-generator"
$remoteUrl = "https://github.com/$owner/$repoName.git"

# リモートがなければ追加
try { git remote get-url origin 2>$null | Out-Null } catch {}
if (-not (git remote get-url origin 2>$null)) {
    git remote add origin $remoteUrl
} else {
    git remote set-url origin $remoteUrl
}

# GITHUB_TOKEN がある場合は API でリポジトリ作成してからプッシュ
if ($env:GITHUB_TOKEN) {
    $headers = @{
        Authorization = "token $env:GITHUB_TOKEN"
        "Content-Type" = "application/json"
    }
    $body = @{ name = $repoName; private = $false } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    } catch {
        if ($_.Exception.Response.StatusCode -eq 422) {
            # 422 = リポジトリが既に存在する
        } else { throw }
    }
    $pushUrl = "https://${env:GITHUB_TOKEN}@github.com/$owner/$repoName.git"
    git remote set-url origin $pushUrl
    git push -u origin main
    git remote set-url origin $remoteUrl
    exit 0
}

# gh でログイン済みなら gh で作成してプッシュ（cmd 経由で stderr を抑止）
cmd /c "gh auth status 2>nul"
$ghOk = ($LASTEXITCODE -eq 0)
if ($ghOk) {
    cmd /c "gh repo view $owner/$repoName 2>nul"
    $repoExists = ($LASTEXITCODE -eq 0)
    if (-not $repoExists) {
        gh repo create $repoName --public --source=. --remote=origin --push
    } else {
        git push -u origin main
    }
    if ($LASTEXITCODE -eq 0) { exit 0 }
}

Write-Host "プッシュするには次のいずれかを行ってください:"
Write-Host "1. 環境変数 GITHUB_TOKEN を設定してこのスクリプトを再実行"
Write-Host "   (GitHub の Settings - Developer settings - Personal access tokens で repo スコープのトークンを作成)"
Write-Host "2. gh auth login でログイン後、このスクリプトを再実行"
exit 1
