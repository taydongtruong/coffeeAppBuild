@echo off
title Cafe Manager System

echo ======================================================
echo   DANG KHOI TAO HE THONG CAFE MANAGER...
echo ======================================================

:: 1. Backend
echo [1/3] Dang cau hinh Backend...
cd /d "%~dp0backend"

if not exist venv\Scripts\activate.bat (
    echo Dang tao moi truong ao venv...
    python -m venv venv
)

echo Dang cai dat thu vien Python...
call venv\Scripts\activate.bat
call pip install -r requirements.txt
start "Backend_Server" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python app.py"

:: 2. Frontend
echo [2/3] Dang cau hinh Frontend...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Dang cai dat thu vien Node JS...
    call npm install
)

:: 3. Run
echo [3/3] Dang khoi chay giao dien...
start "Frontend_UI" cmd /k "cd /d %~dp0frontend && npm start"

echo ======================================================
echo   THANH CONG! He thong dang duoc mo...
echo ======================================================
pause