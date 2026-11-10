@echo off
setlocal EnableExtensions EnableDelayedExpansion
title LEVIX - GitHub auto-sync (keep open)
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo  Git is not installed.
  pause
  exit /b 1
)
git remote get-url levixx >nul 2>nul
if errorlevel 1 git remote add levixx https://github.com/levixfashions-org/levixx.git

echo.
echo  =====================================================
echo     LEVIX GitHub auto-sync is running
echo     Every new commit is pushed to:
echo     https://github.com/levixfashions-org/levixx  (main)
echo  =====================================================
echo  Leave this window open. Close it to stop syncing.
echo.

:LOOP
set "AHEAD=0"
for /f %%c in ('git rev-list --count levixx/main..main 2^>nul') do set "AHEAD=%%c"
if not "!AHEAD!"=="0" (
  echo  [!date! !time:~0,8!] !AHEAD! new commit^(s^) - pushing...
  git push -q levixx main:main
  if errorlevel 1 (
    echo  [!] Push failed - will retry. If GitHub asks you to sign in, please do.
  ) else (
    for /f %%h in ('git rev-parse --short HEAD') do echo  [!date! !time:~0,8!] [OK] GitHub is up to date - %%h
  )
)
timeout /t 20 /nobreak >nul
goto :LOOP
