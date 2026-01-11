@echo off
setlocal
cd /d "%~dp0"
set PORT=3003
set NEXT_DISABLE_TURBOPACK=1

call :ensure_docker
if errorlevel 1 exit /b 1

call :ensure_qdrant
if errorlevel 1 exit /b 1

call :start_app
exit /b 0

:ensure_docker
docker info >nul 2>&1
if %errorlevel%==0 exit /b 0

echo Docker Desktop is not running. Trying to start it...
powershell -NoProfile -Command "$exe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'; if (Test-Path $exe) { Start-Process -FilePath $exe | Out-Null }"
set /a docker_tries=0
:wait_docker
docker info >nul 2>&1
if %errorlevel%==0 exit /b 0
set /a docker_tries+=1
if %docker_tries% GEQ 60 goto docker_fail
timeout /t 2 >nul
goto wait_docker

:docker_fail
echo Docker engine is not available. Please start Docker Desktop.
exit /b 1

:ensure_qdrant
set "QDRANT_EXISTS="
for /f "delims=" %%N in ('docker ps -a --filter "name=^/qdrant$" --format "{{.Names}}" 2^>nul') do set "QDRANT_EXISTS=%%N"
if defined QDRANT_EXISTS goto qdrant_start

echo Creating Qdrant container...
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant >nul 2>&1
if %errorlevel% neq 0 (
  echo Qdrant container already exists or failed to create. Trying to start...
  docker start qdrant >nul 2>&1
  if %errorlevel% neq 0 goto qdrant_fail
)
goto qdrant_wait

:qdrant_start
docker start qdrant >nul 2>&1

:qdrant_wait
set /a q_tries=0
:wait_qdrant
powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:6333/healthz | Out-Null; exit 0}catch{exit 1}"
if %errorlevel%==0 goto qdrant_ok
set /a q_tries+=1
if %q_tries% GEQ 60 goto qdrant_fail
timeout /t 1 >nul
goto wait_qdrant

:qdrant_ok
echo Qdrant is ready.
exit /b 0

:qdrant_fail
echo Qdrant did not become ready on http://127.0.0.1:6333
exit /b 1

:start_app
start "" /b cmd /c "set PORT=%PORT%&& set NEXT_DISABLE_TURBOPACK=%NEXT_DISABLE_TURBOPACK%&& npm run dev"
set /a tries=0
:wait_server
powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:%PORT% | Out-Null; exit 0}catch{exit 1}"
if %errorlevel%==0 goto open_browser
set /a tries+=1
if %tries% GEQ 60 goto open_browser
timeout /t 1 >nul
goto wait_server
:open_browser
start "" http://localhost:%PORT%
exit /b 0
