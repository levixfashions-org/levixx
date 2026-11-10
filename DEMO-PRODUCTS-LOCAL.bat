@echo off
setlocal EnableExtensions
title LEVIX - Demo products for local preview
cd /d "%~dp0"
set "DBLINE="
if exist "local-dev.env" for /f "usebackq tokens=1,* delims==" %%a in ("local-dev.env") do if /i "%%a"=="DATABASE_URL" set "DBLINE=%%b"
if not defined DBLINE (
  echo  Run START-LEVIX-LOCAL.bat first.
  pause
  exit /b 1
)
set "DATABASE_URL=%DBLINE%"
echo.
echo  This only changes your LOCAL test database - never the live store.
echo.
echo    1 = Load demo products
echo    2 = Remove demo products
echo.
pushd backend
choice /c 12 /n /t 15 /d 1 /m " Choose 1 or 2 - loads automatically in 15 seconds: "
if errorlevel 2 (
  call npx tsx prisma/demo-products.ts remove
) else (
  call npx tsx prisma/demo-products.ts
)
popd
echo.
echo  Done. Refresh http://localhost:5173 in your browser.
timeout /t 8
