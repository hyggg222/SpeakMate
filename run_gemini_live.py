"""
Local runner for SpeakMate Gemini Live Pipeline (v3).
Runs independently — no Modal/GPU needed.
Usage: python run_gemini_live.py start
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from livekit import agents
from ai.agents.gemini_live_agent import entrypoint

if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="gemini-live",
        )
    )
