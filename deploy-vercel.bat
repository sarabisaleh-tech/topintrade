@echo off
echo ========================================
echo   Deploy به Vercel
echo ========================================
echo.

echo [1/3] Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo ✅ Build successful!
echo.

echo [2/3] Checking Vercel CLI...
where vercel >nul 2>nul
if errorlevel 1 (
    echo ⚠️  Vercel CLI not found. Installing...
    call npm install -g vercel
)
echo ✅ Vercel CLI ready!
echo.

echo [3/3] Deploying to Vercel...
call vercel --prod
if errorlevel 1 (
    echo ❌ Deploy failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✅ Deploy successful!
echo ========================================
echo.
echo لینک Vercel رو کپی کن و به کاربرات بده
echo.
pause
