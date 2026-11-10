@echo off
setlocal EnableExtensions
title LEVIX - Push to GitHub
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo  Git is not installed. Install it from https://git-scm.com and run this again.
  pause
  exit /b 1
)
git remote get-url levixx >nul 2>nul
if errorlevel 1 git remote add levixx https://github.com/levixfashions-org/levixx.git
echo.
echo  Pushing LEVIX to https://github.com/levixfashions-org/levixx  (branch: main)
echo  If a GitHub sign-in window opens, sign in with the account that owns levixfashions-org.
echo.
git push -u levixx main:main
if errorlevel 1 (
  echo.
  echo  [X] Push failed. Common reasons:
  echo      - You are signed in to a GitHub account without access to levixfashions-org
  echo      - The repository already has commits: tell Claude, it can merge them safely
  pause
  exit /b 1
)
echo.
echo  [OK] Done. Open https://github.com/levixfashions-org/levixx to see the code.
pause
