# 改完 kb 后一键重建并校验
# 用法: .\scripts\sync.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '→ 重建索引...' -ForegroundColor Cyan
node scripts/build-index.mjs
if ($LASTEXITCODE -ne 0) { Write-Host '构建失败' -ForegroundColor Red; exit 1 }

Write-Host '→ 校验...' -ForegroundColor Cyan
node scripts/check.mjs
if ($LASTEXITCODE -ne 0) { Write-Host '校验未通过' -ForegroundColor Red; exit 1 }

Write-Host '✓ 完成' -ForegroundColor Green
