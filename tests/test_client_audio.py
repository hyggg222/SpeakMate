import os
import asyncio
import sys
import soundfile as sf
import numpy as np
import json
from livekit import api, rtc

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://speakmate-yu7nfde8.livekit.cloud")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "APItNUc8VAU8Frg")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "V7RaxJa5U57VVz2xj8WhfMdeZ5DQSZfgIDbpqRiUgqcA")

# The audio file the user wants to test
AUDIO_FILE = r"d:\SpeakMate\sample_voice\sample1\voice1.wav"

async def main():
    print("Connecting to LiveKit...")
    room = rtc.Room()

    token_api = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token_api.with_identity("test_audio_client")
    token_api.with_name("Alice")
    # Room name must match the one the agent is listening to, or any random since Modal agent listens to all rooms or dispatch
    # Wait, the Modal agent uses agents.cli.run_app, which by default uses an AutoDispatch or connects to a specific room?
    # Usually in agents.cli, worker connects to any room where a participant joins if matching dispatch. We'll join a random room.
    room_name = "test-voice-room-1"
    token_api.with_grants(api.VideoGrants(room_join=True, room=room_name))
    token_api.with_metadata(json.dumps({"scenario": {"goals": ["Phỏng vấn ngắn âm thanh"]}, "history": [], "userName": "Tester"}))
    token = token_api.to_jwt()

    @room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        text = data_packet.data.decode('utf-8')
        try:
            msg = json.loads(text)
            print(f">>> [TRANSCRIPT] {msg['speaker']}: {msg['line']}")
        except:
            pass

    @room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print("🔊 Agent Audio track received! (Synthesized voice from Valtec)")

    # Connect
    await room.connect(LIVEKIT_URL, token)
    print("Connected!")

    # Wait a bit for Agent to connect
    await asyncio.sleep(2)

    print(f"Reading audio file {AUDIO_FILE}...")
    try:
        import librosa
        data, sample_rate = librosa.load(AUDIO_FILE, sr=None, mono=True)
        num_channels = 1
        print(f"Audio properties: Channels={num_channels}, SampleRate={sample_rate}")

        source = rtc.AudioSource(sample_rate, num_channels)
        track = rtc.LocalAudioTrack.create_audio_track("test_mic", source)
        options = rtc.TrackPublishOptions()
        options.source = rtc.TrackSource.SOURCE_MICROPHONE
        
        await room.local_participant.publish_track(track, options)
        print("Published local track. Sending audio frames...")

        # Convert float32 to int16 bytes
        data_int16 = (data * 32767).astype(np.int16)
        data_bytes = data_int16.tobytes()
        bytes_per_sample = 2 * num_channels # int16 is 2 bytes
        
        # 10ms chunks
        chunk_size_bytes = int(sample_rate / 100) * bytes_per_sample
        
        for i in range(0, len(data_bytes), chunk_size_bytes):
            chunk = data_bytes[i:i+chunk_size_bytes]
            # Pad if last chunk is too small
            if len(chunk) < chunk_size_bytes:
                chunk += b'\x00' * (chunk_size_bytes - len(chunk))
                
            audio_frame = rtc.AudioFrame(data=chunk, sample_rate=sample_rate, num_channels=num_channels, samples_per_channel=len(chunk) // bytes_per_sample)
            await source.capture_frame(audio_frame)
            await asyncio.sleep(0.01)
            
        print("Finished sending audio. Waiting for Agent STT and LLM response...")
    except Exception as e:
        print(f"Failed to play audio: {e}")

    # Wait for the AI's transcript & TTS Response
    for i in range(15):
        await asyncio.sleep(1)

    print("Disconnecting...")
    await room.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
