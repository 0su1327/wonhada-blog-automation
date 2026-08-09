@echo off
chcp 65001 > nul
echo ===================================
echo   원하다 필라테스 블로그 작성 시작
echo ===================================
echo.

REM 1. 이 배치파일이 있는 폴더로 이동 (docker-compose.local.yml이 같은 폴더에 있어야 합니다)
cd /d "%~dp0"

echo n8n을 켜는 중입니다. 잠시만 기다려주세요...
docker compose up -d

REM 2. n8n이 완전히 켜질 때까지 약 20초 대기
timeout /t 20 /nobreak > nul

echo.
echo 준비 완료! 블로그 작성 화면을 엽니다.

REM 3. 기본 브라우저로 폼 페이지 열기 (실제 Vercel 배포 주소로 바꿔주세요)
start https://blogautomation-pi.vercel.app

echo.
echo 작성을 마치셨으면 이 창은 그냥 닫으셔도 됩니다.
echo (n8n은 계속 켜져 있다가, 컴퓨터를 끄면 같이 꺼집니다)
pause
