@echo off
cd /d "%~dp0"
docker compose up -d
timeout /t 20 /nobreak > nul
start https://blogautomation-pi.vercel.app
pause
