@echo off
echo ========================================================
echo   LIMA FASHION - Local Server Startup
echo ========================================================
echo Checking for Python dependencies...
py -m pip install -r backend/requirements.txt
echo.
echo Starting Flask backend server...
py backend/app.py
pause
