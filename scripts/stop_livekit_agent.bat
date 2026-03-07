@echo off
echo --- [SpeakMate] Note: LiveKit Agent on Modal ---
echo Modal containers auto-scale to 0 after 10 minutes of idle.
echo No need to manually stop - they will stop on their own.
echo.
echo If you REALLY want to stop the deployed app (requires redeploy later):
echo   modal app stop speakmate-pipeline-v2
echo.
echo Current app status:
set PYTHONIOENCODING=utf-8
python -X utf8 -m modal app list 2>nul | findstr speakmate
