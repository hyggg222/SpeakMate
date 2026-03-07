@echo off
title SpeakMate Gemini Live Agent
echo --- [SpeakMate] Starting Gemini Live Agent (v3) ---
set PYTHONIOENCODING=utf-8
set LIVEKIT_URL=wss://speakmate-yu7nfde8.livekit.cloud
set LIVEKIT_API_KEY=APItNUc8VAU8Frg
set LIVEKIT_API_SECRET=V7RaxJa5U57VVz2xj8WhfMdeZ5DQSZfgIDbpqRiUgqcA
set GEMINI_API_KEY=AIzaSyByOPTnlpym_UP8SJjwGCTh6rWFQCHcDWQ
set BACKEND_URL=https://broadcasting-that-philips-broadway.trycloudflare.com
set INTERNAL_API_KEY=08d0ab12e2f94e0b4b86fbd9389b920ead233549c7b68d8f6111b5220f9cbe3d
python run_gemini_live.py start
pause
