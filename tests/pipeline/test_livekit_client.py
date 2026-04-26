import os
import asyncio
from livekit import api, rtc
import wave
import json

# Replace with your actual LiveKit API Key and Secret
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://speakmate-yu7nfde8.livekit.cloud")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "APItNUc8VAU8Frg")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "V7RaxJa5U57VVz2xj8WhfMdeZ5DQSZfgIDbpqRiUgqcA")

async def main():
    print("Connecting to LiveKit...")
    # Initialize the Room
    room = rtc.Room()

    # Create a token for the test client
    token_api = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token_api.with_identity("test_user_123")
    token_api.with_name("Test User")
    token_api.with_grants(api.VideoGrants(
        room_join=True,
        room="speakmate-test-room",
    ))
    # We add metadata so the worker receives it
    metadata = json.dumps({
        "scenario": {
            "goals": ["Nói chuyện ngẫu nhiên về tiếng Anh", "Chào hỏi một câu thật tự nhiên"],
            "startingTurns": [
                {"speaker": "AI", "line": "Chào bạn Nam, rất vui được gặp bạn! Hôm nay chúng ta sẽ luyện nói tiếng Anh nhé."}
            ]
        },
        "history": [],
        "userName": "Nam"
    })
    token_api.with_metadata(metadata)
    
    token = token_api.to_jwt()

    # Event listeners
    @room.on("participant_connected")
    def on_participant_connected(participant):
        print(f"Agent/Participant joined: {participant.identity}")

    @room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        text = data_packet.data.decode('utf-8')
        try:
            msg = json.loads(text)
            print(f">>> [TRANSCRIPT] {msg['speaker']}: {msg['line']}")
        except:
            print(f">>> [DATA] {text}")

    @room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        print(f"Agent audio track subscribed. We should hear audio now!")
        # Normally you would attach this to an audio sink or player,
        # but in our script we just want to verify we receive it.
        # It's an AudioTrack, we can attach an AudioStream to it
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            audio_stream = rtc.AudioStream(track)
            
            async def listen_loop():
                async for event in audio_stream:
                    # just print something occasionally so we know audio is flowing
                    pass

            asyncio.create_task(listen_loop())

    # Connect to room
    await room.connect(LIVEKIT_URL, token)
    print("Connected successfully. Waiting for Agent to speak...")

    # Wait 30 seconds to allow interaction
    for i in range(30):
        await asyncio.sleep(1)
        if i == 5:
            print("You can simulate sending an audio track here, but for this test we rely on Agent's auto-greeting...")
    
    # Cleanup
    await room.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
