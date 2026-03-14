# GitHub に web-site-generator リポジトリを作成してプッシュする
# 実行前: gh auth login でログイン済みであること

Set-Location $PSScriptRoot\..

# リモートがなければ追加
if (-not (git remote get-url origin 2>$null)) {
    git remote add origin https://github.com/RintaroYamaoka/web-site-generator.git
}

# リポジトリが存在しなければ作成してプッシュ、存在すればプッシュのみ
$exists = gh repo view RintaroYamaoka/web-site-generator 2>$null
if (-not $LASTEXITCODE -eq 0) {
    gh repo create web-site-generator --public --source=. --remote=origin --push
} else {
    git push -u origin main
}
