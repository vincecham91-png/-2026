# Star Photo Share — R2 圖片上傳設置腳本
# 使用方式：
#   1. 打開 https://dash.cloudflare.com/6254e69fe94dce26b5b4b79b5e5b4418/r2/overview
#   2. 點擊「Enable R2」按鈕
#   3. 回到終端機，運行此腳本：
#      powershell -File setup-r2.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Star Photo Share — R2 設置腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$workerDir = "c:\Users\PC\Desktop\星图网页\worker"
Set-Location $workerDir

# Step 1: 創建 R2 Bucket
Write-Host "[1/3] 創建 R2 Bucket..." -ForegroundColor Yellow
try {
  $result = npx wrangler r2 bucket create star-photo-uploads 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Bucket 創建成功" -ForegroundColor Green
  } else {
    Write-Host "  ⚠️ $result" -ForegroundColor Yellow
  }
} catch {
  Write-Host "  ❌ 創建失敗: $_" -ForegroundColor Red
}

# Step 2: 取得 R2 Public ID
Write-Host "[2/3] 更新 Worker 配置..." -ForegroundColor Yellow
$wranglerToml = Join-Path $workerDir "wrangler.toml"
$content = Get-Content $wranglerToml -Raw -Encoding UTF8

# 啟用 R2 配置
$content = $content -replace '# R2 圖片儲存.*\n# 需先在.*\n# 啟用後取消下行註解並重新部署：\n# \[\[r2_buckets\]\]\n# binding = "PHOTOS"\n# bucket_name = "star-photo-uploads"', @'
# R2 圖片儲存（已啟用）
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "star-photo-uploads"
'@

Set-Content $wranglerToml -Value $content -Encoding UTF8 -NoNewline
Write-Host "  ✅ wrangler.toml 已更新" -ForegroundColor Green

# Step 3: 部署 Worker
Write-Host "[3/3] 部署 Worker 到 Cloudflare..." -ForegroundColor Yellow
try {
  $result = npx wrangler deploy 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Worker 已部署" -ForegroundColor Green
  } else {
    Write-Host "  ⚠️ $result" -ForegroundColor Yellow
  }
} catch {
  Write-Host "  ❌ 部署失敗: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  設置完成！" -ForegroundColor Green
Write-Host "  Worker URL: https://star-photo-api.vincecham91.workers.dev" -ForegroundColor Cyan
Write-Host "  Health: https://star-photo-api.vincecham91.workers.dev/api/health" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
