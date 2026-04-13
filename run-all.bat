@echo off
echo [SpeakMate] Starting all services...

:: Ensure Ollama is running (Vistral 7B Chat for LLM)
:: If not started: ollama serve (in a separate terminal)
echo [SpeakMate] Make sure Ollama is running: ollama serve

:: Start Backend in a new window
start "SpeakMate Backend" cmd /k "cd backend && npm run dev"

:: Start Frontend in a new window
start "SpeakMate Frontend" cmd /k "cd frontend && npm run dev"

:: Start TTS Backend in a new window
start "SpeakMate TTS" cmd /k "cd backend-tts && ..\venv\Scripts\python main.py"

:: Start STT Backend in a new window
start "SpeakMate STT" cmd /k "cd backend-stt && ..\venv\Scripts\python main.py"

exit
