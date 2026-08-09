@echo off
cd /d "%~dp0"
docker compose up -d
timeout /t 5 /nobreak > nul
start https://blogautomation-pi.vercel.app
pause
