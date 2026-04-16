import asyncio
import json
import numpy as np
import wave
import os
from livekit import api, rtc

# --- Configuration ---
LIVEKIT_URL = "wss://speakmate-yu7nfde8.livekit.cloud"
LIVEKIT_API_KEY = "APItNUc8VAU8Frg"
LIVEKIT_API_SECRET = "V7RaxJa5U57VVz2xj8WhfMdeZ5DQSZfgIDbpqRiUgqcA"
AUDIO_FILE = r"dia2\example_prefix1.wav"
ROOM_NAME = "test-room-direct"
USER_IDENTITY = "python-test-client"

def check_wav_format(file_path):
    try:
        with open(file_path, 'rb') as f:
            header = f.read(4)
            if header != b'RIFF':
                print(f"Error: {file_path} is NOT a valid RIFF/WAV file (found {header!r}).")
                return False
            return True
    except Exception as e:
        print(f"Error checking file: {e}")
        return False

async def main():
    if not os.path.exists(AUDIO_FILE):
        print(f"Error: {AUDIO_FILE} not found.")
        return
        
    if not check_wav_format(AUDIO_FILE):
        return

    print(f"--- [Test] Starting LiveKit Agent Test ---")
    
    # 1. Generate Token
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(USER_IDENTITY)
        .with_name("Python Tester")
        .with_grants(api.VideoGrants(room_join=True, room=ROOM_NAME))
        .with_metadata(json.dumps({
            "scenario": {
                "interviewerPersona": "English Tutor",
                "goals": ["Test LiveKit Agent"],
                "startingTurns": [{"speaker": "AI", "line": "Hello, I am ready to test."}]
            },
            "history": [],
            "userName": "Tester"
        }))
        .to_jwt()
    )

    # 2. Connect to Room
    room = rtc.Room()
    print(f"Connecting to {LIVEKIT_URL}...")
    
    @room.on("data_received")
    def on_data(data: rtc.DataPacket):
        try:
            payload = json.loads(data.data.decode('utf-8'))
            if payload.get('type') == 'transcript':
                print(f"\n[AGENT TRANSCRIPT] {payload.get('speaker')}: {payload.get('line')}\n")
        except Exception:
            pass

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        print(f"--- [Room] Participant connected: {participant.identity} ({participant.name or 'no name'}) ---")

    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"--- [Room] Subscribed to track {track.sid} from {participant.identity} ---")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"--- [Room] Agent is speaking (Audio track received) ---")

    try:
        await room.connect(LIVEKIT_URL, token)
        print(f"Connected to room: {room.name}")
        print(f"Local participant: {room.local_participant.identity}")
        print(f"Current participants: {[p.identity for p in room.remote_participants.values()]}")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # Give the agent a moment to join
    print("Waiting up to 30s for agent to join (Modal cold start might take time)...")
    agent_found = False
    for i in range(30):
        await asyncio.sleep(1)
        if any(p.identity.startswith('agent-') for p in room.remote_participants.values()):
            print(f"Agent detected! Current participants: {[p.identity for p in room.remote_participants.values()]}")
            agent_found = True
            break
        if i % 5 == 0:
            print(f"Waiting... ({i+1}/30)")

    if not agent_found:
        print("Error: Agent worker did not join the room in time. Check 'modal serve' logs.")
        await room.disconnect()
        return

    # 4. Stream Audio File
    print(f"\nWAV file: {AUDIO_FILE}")
    try:
        with wave.open(AUDIO_FILE, 'rb') as wf:
            framerate    = wf.getframerate()
            nchannels    = wf.getnchannels()
            nframes      = wf.getnframes()
            duration_sec = nframes / framerate
            print(f"WAV info: {framerate}Hz, {nchannels}ch, {duration_sec:.1f}s")

            source  = rtc.AudioSource(framerate, 1)
            track   = rtc.LocalAudioTrack.create_audio_track("mic", source)
            options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
            await room.local_participant.publish_track(track, options)
            print("Track published. Agent should subscribe shortly.")

            wf.rewind()
            all_data       = wf.readframes(nframes)
            audio_data_all = np.frombuffer(all_data, dtype=np.int16)
            if nchannels > 1:
                audio_data_all = audio_data_all.reshape(-1, nchannels).mean(axis=1).astype(np.int16)

            samples_per_frame = int(framerate * 0.02)  # 20ms frames
            is_streaming      = False

            async def streaming_task():
                nonlocal is_streaming
                idx = 0
                while True:
                    if is_streaming:
                        chunk = audio_data_all[idx : idx + samples_per_frame]
                        if len(chunk) < samples_per_frame:
                            idx = 0  # loop
                            continue
                        await source.capture_frame(rtc.AudioFrame(
                            data=chunk.tobytes(),
                            sample_rate=framerate,
                            num_channels=1,
                            samples_per_channel=len(chunk),
                        ))
                        idx += samples_per_frame
                        await asyncio.sleep(0.02)
                    else:
                        await asyncio.sleep(0.05)

            asyncio.create_task(streaming_task())

            STREAM_SECONDS = 4  # seconds to stream before auto-pause
            print(f"\n--- Controls ---")
            print(f"'s' = stream {STREAM_SECONDS}s then auto-pause (simulates one utterance)")
            print(f"'q' = quit\n")

            while True:
                cmd = await asyncio.get_event_loop().run_in_executor(None, input, "> ")
                if cmd.strip().lower() == 's':
                    is_streaming = True
                    print(f"[Test] Streaming {STREAM_SECONDS}s of audio...")
                    await asyncio.sleep(STREAM_SECONDS)
                    is_streaming = False
                    print("[Test] Auto-paused. Waiting for agent VAD/STT/LLM/TTS response...")
                    print("      (watch Modal logs — press 'q' when done or 's' to send again)")
                elif cmd.strip().lower() == 'q':
                    break

    except Exception as e:
        print(f"Streaming error: {e}")

    await room.disconnect()
    print("Test complete.")

    print("\nAudio stream finished. Waiting 10s for transcript response...")
    await asyncio.sleep(10)
    
    await room.disconnect()
    print("Test complete.")

if __name__ == "__main__":
    asyncio.run(main())
