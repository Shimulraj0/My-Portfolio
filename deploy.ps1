param(
  [string]$RepoPath = "$env:TEMP\opencode\gh-pages-repo",
  [string]$SourcePath = "C:\Users\dasra\portfolio"
)

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Shimulraj0/Shimulraj0.github.io.git"

Set-Location $SourcePath

Write-Host "1/4 Building site..." -ForegroundColor Cyan
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

if (-not (Test-Path "$RepoPath\.git")) {
  Write-Host "Cloning gh-pages repo..." -ForegroundColor Cyan
  git clone $Repo $RepoPath 2>$null
}

Write-Host "2/4 Clearing old files..." -ForegroundColor Cyan
Get-ChildItem $RepoPath -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

Write-Host "3/4 Copying dist..." -ForegroundColor Cyan
Copy-Item "C:\Users\dasra\portfolio\dist\*" $RepoPath -Recurse -Force
Set-Content -Path "$RepoPath\.nojekyll" -Value "" -NoNewline
Set-Content -Path "$RepoPath\CNAME" -Value "shimul.is-a.dev" -NoNewline

$readme = @'
# Shimul Raj Das — Portfolio

Live at https://shimulraj0.github.io

Flutter developer portfolio built with Vite + React + Tailwind CSS v4 + Framer Motion. Every app screenshot is a real runtime capture from an Android emulator.

Built and deployed automatically via `deploy.ps1` in the source project.
'@
Set-Content -Path "$RepoPath\README.md" -Value $readme -Encoding UTF8

Write-Host "4/4 Committing and pushing..." -ForegroundColor Cyan
cmd /c "git -C $RepoPath add -A 2>NUL"
if ($LASTEXITCODE -eq 0) {
  cmd /c "git -C $RepoPath -c user.name=shimulraj0 -c user.email=shimulrajdas001@gmail.com commit -m ""Deploy portfolio (built $(Get-Date -Format 'yyyy-MM-dd HH:mm'))"" 2>NUL"
  if ($LASTEXITCODE -eq 0) {
    cmd /c "git -C $RepoPath push origin main 2>NUL"
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Done! Live in ~1-2 min at https://shimul.is-a.dev (and https://shimulraj0.github.io)" -ForegroundColor Green
    } else {
      Write-Host "Push failed - run 'git -C $RepoPath push origin main' manually" -ForegroundColor Yellow
    }
  } else {
    Write-Host "Nothing to commit or commit failed - site may already be up to date" -ForegroundColor Yellow
  }
} else {
  Write-Host "git add failed" -ForegroundColor Red
}
