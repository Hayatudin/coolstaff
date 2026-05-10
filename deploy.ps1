Write-Host "🚀 Starting DAERA cPanel Deployment Build..." -ForegroundColor Cyan

Write-Host "🧹 Cleaning up old build files..."
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "cpanel-deploy.zip") { Remove-Item -Force "cpanel-deploy.zip" }

Write-Host "📦 Installing dependencies and generating Prisma Client..."
npm install
npx prisma generate

Write-Host "🏗️ Building Next.js Standalone app..."
npm run build

if (-Not (Test-Path ".next/standalone")) {
    Write-Host "❌ Build failed! .next/standalone folder not found." -ForegroundColor Red
    exit 1
}

Write-Host "🗜️ Zipping deployment package..."
# We zip the standalone folder contents and the static folder
Compress-Archive -Path ".next\standalone\*", ".next\static", "server.js" -DestinationPath "cpanel-deploy.zip" -Force

Write-Host "DONE! Upload cpanel-deploy.zip to cPanel." -ForegroundColor Green
