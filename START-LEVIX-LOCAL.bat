@echo off
setlocal EnableExtensions
title LEVIX - Local Launcher
cd /d "%~dp0"

echo.
echo  =====================================================
echo     LEVIX - starting the store on your computer
echo  =====================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE
for /f "delims=" %%v in ('node -v') do echo  [OK] Node.js %%v

set "NODE_ENV=development"
set "PORT=4000"
set "FRONTEND_URL=http://localhost:5173"

rem ================= 0. Stop any old copy first - frees ports and unlocks database files =================
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
timeout /t 2 /nobreak >nul

rem ================= 1. Packages - first run only =================
if exist "backend\node_modules\.bin\tsx.cmd" goto :BACKEND_OK
echo.
echo  [1/4] Installing backend packages - first time only, 1-3 minutes...
pushd backend
call npm install --no-audit --no-fund --loglevel=error
popd
if not exist "backend\node_modules\.bin\tsx.cmd" goto :INSTALL_FAIL
:BACKEND_OK
if exist "frontend\node_modules\.bin\vite.cmd" goto :FRONTEND_OK
echo.
echo  [1/4] Installing frontend packages - first time only...
pushd frontend
call npm install --no-audit --no-fund --loglevel=error
popd
if not exist "frontend\node_modules\.bin\vite.cmd" goto :INSTALL_FAIL
:FRONTEND_OK
echo  [OK] Packages ready
pushd backend
call npx prisma generate >nul 2>nul
if errorlevel 1 (
  echo  [!] Retrying database client generation...
  timeout /t 3 /nobreak >nul
  call npx prisma generate
)
popd

rem ================= 2. Find a local database automatically =================
echo.
echo  [2/4] Connecting to a local MySQL database...
set "DBLINE="
if exist "local-dev.env" for /f "usebackq tokens=1,* delims==" %%a in ("local-dev.env") do if /i "%%a"=="DATABASE_URL" set "DBLINE=%%b"
if defined DBLINE (
  call :TRYDB "%DBLINE%"
  if not errorlevel 1 goto :DB_READY
  echo  Saved settings did not work - searching again...
)

rem a) Installed MySQL on this PC with common default logins
netstat -ano | findstr ":3306 " | findstr LISTENING >nul
if errorlevel 1 goto :TRY_DOCKER
for %%u in ("mysql://root@127.0.0.1:3306/levix_local" "mysql://root:root@127.0.0.1:3306/levix_local" "mysql://root:password@127.0.0.1:3306/levix_local" "mysql://root:admin@127.0.0.1:3306/levix_local") do (
  call :TRYDB %%u
  if not errorlevel 1 (
    set "DBLINE=%%~u"
    goto :DB_SAVE
  )
)

:TRY_DOCKER
rem b) Docker Desktop - runs a private MySQL just for LEVIX on port 3307
where docker >nul 2>nul
if errorlevel 1 goto :ASK_LOGIN
docker info >nul 2>nul
if not errorlevel 1 goto :DOCKER_UP
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  echo  Starting Docker Desktop - this can take up to 2 minutes...
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
)
for /l %%i in (1,1,40) do (
  docker info >nul 2>nul
  if not errorlevel 1 goto :DOCKER_UP
  timeout /t 3 /nobreak >nul
)
goto :ASK_LOGIN

:DOCKER_UP
docker start levix-mysql >nul 2>nul
if errorlevel 1 (
  echo  Creating a private LEVIX MySQL container - first time downloads about 200 MB...
  docker run -d --name levix-mysql --restart unless-stopped -e MYSQL_ROOT_PASSWORD=levixlocal -e MYSQL_DATABASE=levix_local -p 3307:3306 mysql:8.0 >nul
  if errorlevel 1 goto :ASK_LOGIN
)
echo  Waiting for the LEVIX database container to be ready...
for /l %%i in (1,1,40) do (
  call :TRYDB "mysql://root:levixlocal@127.0.0.1:3307/levix_local"
  if not errorlevel 1 (
    set "DBLINE=mysql://root:levixlocal@127.0.0.1:3307/levix_local"
    goto :DB_SAVE
  )
  timeout /t 3 /nobreak >nul
)

:ASK_LOGIN
rem c) Last resort: ask for the MySQL login once
echo.
echo  Could not log in to MySQL automatically.
echo  Please enter your LOCAL MySQL login once. It is saved only on this computer.
set "MYSQL_USER="
set /p "MYSQL_USER= MySQL username - press Enter for root: "
if "%MYSQL_USER%"=="" set "MYSQL_USER=root"
set "MYSQL_PASS="
set /p "MYSQL_PASS= MySQL password: "
set "ENC_PASS="
if not "%MYSQL_PASS%"=="" for /f "usebackq delims=" %%e in (`powershell -NoProfile -Command "[uri]::EscapeDataString($env:MYSQL_PASS)"`) do set "ENC_PASS=%%e"
if "%ENC_PASS%"=="" set "DBLINE=mysql://%MYSQL_USER%@127.0.0.1:3306/levix_local"
if not "%ENC_PASS%"=="" set "DBLINE=mysql://%MYSQL_USER%:%ENC_PASS%@127.0.0.1:3306/levix_local"
call :TRYDB "%DBLINE%"
if errorlevel 1 goto :DB_FAIL

:DB_SAVE
> "local-dev.env" echo DATABASE_URL=%DBLINE%

:DB_READY
set "DATABASE_URL=%DBLINE%"
echo  [OK] Database ready - levix_local


rem ================= 4. Start API + storefront =================
echo.
echo  [3/4] Starting LEVIX API on http://localhost:4000 ...
start "LEVIX API - keep open" /D "%~dp0backend" cmd /k npx tsx src/server.ts
set "API_OK="
for /l %%i in (1,1,30) do (
  if not defined API_OK (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:4000/api/health; exit 0 } catch { if ($_.Exception.Response) { exit 0 } else { exit 1 } }" >nul 2>nul
    if not errorlevel 1 (set "API_OK=1") else (timeout /t 1 /nobreak >nul)
  )
)
if defined API_OK (echo  [OK] API is running) else (echo  [!] API is slow to start - check the "LEVIX API" window for errors)

echo  [4/4] Starting LEVIX storefront on http://localhost:5173 ...
start "LEVIX Storefront - keep open" /D "%~dp0frontend" cmd /k npx vite --port 5173 --strictPort --host localhost
set "WEB_OK="
for /l %%i in (1,1,30) do (
  if not defined WEB_OK (
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:5173 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (set "WEB_OK=1") else (timeout /t 1 /nobreak >nul)
  )
)

start "" http://localhost:5173

echo.
echo  =====================================================
echo     LEVIX is running:   http://localhost:5173
echo     Admin panel:        http://localhost:5173/admin
echo     API health check:   http://localhost:4000/api/health
echo  =====================================================
echo  Keep the two LEVIX windows open. Close them to stop the store.
echo.
pause
exit /b 0

rem ---------- helper: try a database URL, create tables if it works ----------
:TRYDB
set "DATABASE_URL=%~1"
pushd "%~dp0backend"
call npx prisma db push --skip-generate --accept-data-loss >nul 2>nul
set "TRY_RC=%errorlevel%"
popd
exit /b %TRY_RC%

:NO_NODE
echo  [X] Node.js is not installed. Install it from https://nodejs.org and run this again.
pause
exit /b 1

:INSTALL_FAIL
echo.
echo  [X] Package install failed - usually no internet access.
echo      If you are on college or office Wi-Fi, sign in to it in your browser, then run this again.
pause
exit /b 1

:DB_FAIL
echo.
echo  [X] Could not connect to MySQL with that login.
echo      Start MySQL: Win+R, type services.msc, find MySQL80, click Start. Then run this again.
pause
exit /b 1
