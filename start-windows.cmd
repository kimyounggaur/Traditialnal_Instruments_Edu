@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 이상을 먼저 설치한 뒤 다시 실행해주세요.
  pause
  exit /b 1
)
if not exist node_modules (
  echo 첫 실행에 필요한 패키지를 설치합니다...
  call npm ci
  if errorlevel 1 (
    echo 설치에 실패했습니다. 인터넷 연결과 Node.js 버전을 확인해주세요.
    pause
    exit /b 1
  )
)
echo 브라우저에서 http://localhost:3000 을 열어주세요.
echo 종료하려면 Ctrl+C를 누르세요.
call npm run dev
pause
