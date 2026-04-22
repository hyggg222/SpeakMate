"""
GeminiLiveAgent — LiveKit bridge agent using Gemini Live API (native audio bidirectional).
Architecture: LiveKit mic → Gemini Live WebSocket → LiveKit speaker
No separate STT/TTS pipeline needed — Gemini handles everything natively.
"""
import os
import asyncio
import json
import base64


class GeminiLiveAgent:
    GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"
    OUTPUT_SAMPLE_RATE = 24000

    def __init__(self, ctx, genai_client):
        self.ctx = ctx
        self.genai_client = genai_client
        self.audio_source = None
        self.scenario = {}
        self.history = []
        self.user_name = "bạn"
        self.system_prompt = ""
        self.session_id = ""
        self.turn_counter = 0
        # Register BEFORE connect() to avoid missing early events
        self.ctx.room.on("track_subscribed", self._on_track_subscribed)

    async def start(self):
        from livekit import rtc

        self.audio_source = rtc.AudioSource(self.OUTPUT_SAMPLE_RATE, 1)
        await self.ctx.connect()

        track = rtc.LocalAudioTrack.create_audio_track("agent-mic", self.audio_source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        pub = await self.ctx.room.local_participant.publish_track(track, options)
        print(f"[GeminiLive] Audio track published: {pub.sid}", flush=True)

        participant = await self.ctx.wait_for_participant()
        print(f"[GeminiLive] Participant joined: {participant.identity}", flush=True)
        await self._fetch_context(participant)

        print(f"[GeminiLive] Ready. User: {self.user_name}", flush=True)

        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "agent_ready"}).encode(), reliable=True
        )
        print("[GeminiLive] agent_ready sent.", flush=True)

    async def _fetch_context(self, participant):
        try:
            meta = json.loads(participant.metadata or "{}")
            if meta.get("v", 1) >= 2:
                session_id = meta.get("session_id", "")
                self.session_id = session_id
                backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
                internal_key = os.environ.get("INTERNAL_API_KEY", "")
                if session_id and backend_url:
                    import httpx
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.get(
                            f"{backend_url}/api/internal/sessions/{session_id}/context",
                            headers={"Authorization": f"Bearer {internal_key}"}
                        )
                    if resp.status_code == 200:
                        ctx_data = resp.json()
                        self.scenario   = ctx_data.get("scenario", {})
                        self.history    = ctx_data.get("history", [])
                        self.user_name  = ctx_data.get("userName", "bạn")
                        self.system_prompt = ctx_data.get("systemPrompt", "")
                        print(f"[GeminiLive] Context: {len(self.history)} turns, user={self.user_name}", flush=True)
        except Exception as e:
            print(f"[GeminiLive] Context fetch error: {e}", flush=True)

        if not self.system_prompt:
            persona = self.scenario.get("interviewerPersona", "Người hướng dẫn")
            goals   = ", ".join(self.scenario.get("goals", []))
            self.system_prompt = (
                f"### IDENTITY\n"
                f"Bạn là: {persona}.\n"
                f"Đối tượng giao tiếp: {self.user_name}.\n"
                f"Bối cảnh: {goals}.\n\n"

                f"### CONVERSATIONAL STYLE (VOICE-ONLY)\n"
                f"1. PHẢN XẠ NHANH: Trả lời ngắn gọn, súc tích (tối đa 4 câu). Nếu có thể thì hãy đưa ra những nhận xét, đánh giá, quan điểm thay vì chỉ đưa ra câu hỏi. Tập trung vào ý chính.\n"
                f"2. NGỮ ĐIỆU TỰ NHIÊN: Bạn đang nói chuyện trực tiếp, không phải viết văn. Sử dụng các từ đệm như 'À', 'Ừm', 'Thế à', 'Vậy hả' một cách hợp lý để tăng độ thực.\n"
                f"3. XƯNG HÔ: Sử dụng đại từ nhân xưng phù hợp văn hóa Việt Nam (ví dụ: anh/chị - em hoặc mình - bạn) tùy theo nhân vật {persona}.\n"
                f"4. AFFECTIVE DIALOG: Lắng nghe tông giọng của {self.user_name}. Nếu người dùng lo lắng, hãy dùng giọng an ủi. Nếu người dùng hào hứng, hãy đáp lại bằng sự nhiệt huyết.\n"
                f"5. KHÔNG LẶP LẠI: Tuyệt đối không nhắc lại y hệt những gì người dùng vừa nói (parrot back).\n\n"

                f"### GUARDRAILS\n"
                f"- NGÔN NGỮ CHÍNH: Tiếng Việt. Hãy luôn chủ động giao tiếp và phản hồi bằng tiếng Việt tự nhiên.\n"
                f"- KHÔNG đọc các ký tự đặc biệt, dấu ngoặc vuông [], hoặc placeholder.\n"
                f"- KHÔNG liệt kê danh sách gạch đầu dòng.\n"
                f"- Nếu người dùng ngắt lời (barge-in), hãy dừng lại và lắng nghe ngay lập tức."
            )

    def _on_track_subscribed(self, track_recv, publication_recv, participant_recv):
        from livekit import rtc
        if track_recv.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"[GeminiLive] Subscribed to audio from {participant_recv.identity}", flush=True)
            asyncio.create_task(self._run_gemini_session(track_recv))

    async def _run_gemini_session(self, track_recv):
        from livekit import rtc
        from google.genai import types

        live_config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part(text=self.system_prompt)]
            ),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                )
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        print("[GeminiLive] Connecting to Gemini Live API...", flush=True)
        try:
            async with self.genai_client.aio.live.connect(
                model=self.GEMINI_LIVE_MODEL, config=live_config
            ) as session:
                print("[GeminiLive] Connected to Gemini Live.", flush=True)
                audio_stream = rtc.AudioStream(track_recv, sample_rate=16000, num_channels=1)
                await asyncio.gather(
                    self._send_loop(session, audio_stream),
                    self._recv_loop(session),
                )
        except Exception as e:
            print(f"[GeminiLive] Session error: {e}", flush=True)
            import traceback; traceback.print_exc()

    async def _send_loop(self, session, audio_stream):
        """Forward LiveKit audio frames → Gemini Live."""
        from google.genai import types
        try:
            async for event in audio_stream:
                frame = event.frame if hasattr(event, "frame") else event
                # PCM16 at 16kHz raw bytes — what Gemini expects
                await session.send_realtime_input(
                    audio=types.Blob(data=bytes(frame.data), mime_type="audio/pcm;rate=16000")
                )
        except Exception as e:
            print(f"[GeminiLive] Send loop error: {e}", flush=True)

    async def _recv_loop(self, session):
        """Forward Gemini Live audio → LiveKit speaker + transcripts to data channel."""
        from livekit import rtc
        import numpy as np

        spf = int(self.OUTPUT_SAMPLE_RATE * 0.02)  # 20ms frames
        ai_text_buffer = []
        user_text_buffer = []

        try:
            async for response in session.receive():
                if not response.server_content:
                    continue

                sc = response.server_content

                # Audio output → publish to LiveKit track
                if sc.model_turn:
                    for part in sc.model_turn.parts:
                        if part.inline_data and "audio" in (part.inline_data.mime_type or ""):
                            raw = part.inline_data.data
                            if isinstance(raw, str):
                                raw = base64.b64decode(raw)
                            audio_i16 = np.frombuffer(raw, dtype=np.int16)
                            for i in range(0, len(audio_i16), spf):
                                chunk = audio_i16[i:i + spf]
                                if len(chunk) < spf:
                                    chunk = np.pad(chunk, (0, spf - len(chunk)))
                                await self.audio_source.capture_frame(rtc.AudioFrame(
                                    data=chunk.tobytes(),
                                    sample_rate=self.OUTPUT_SAMPLE_RATE,
                                    num_channels=1,
                                    samples_per_channel=spf,
                                ))

                # Input transcription (user speech → text)
                if sc.input_transcription and sc.input_transcription.text:
                    user_text_buffer.append(sc.input_transcription.text)

                # Output transcription (AI speech → text)
                if sc.output_transcription and sc.output_transcription.text:
                    ai_text_buffer.append(sc.output_transcription.text)

                # Turn complete → publish transcripts
                if sc.turn_complete:
                    user_text = "".join(user_text_buffer).strip()
                    ai_text   = "".join(ai_text_buffer).strip()
                    user_text_buffer.clear()
                    ai_text_buffer.clear()

                    user_idx = self.turn_counter
                    ai_idx   = self.turn_counter + 1
                    self.turn_counter += 2

                    if user_text:
                        print(f"[GeminiLive] User: '{user_text}'", flush=True)
                        await self.ctx.room.local_participant.publish_data(
                            json.dumps({"type": "transcript", "speaker": "User",
                                        "line": user_text, "turn_index": user_idx}).encode(),
                            reliable=True,
                        )
                    if ai_text:
                        print(f"[GeminiLive] AI: '{ai_text}'", flush=True)
                        await self.ctx.room.local_participant.publish_data(
                            json.dumps({"type": "transcript", "speaker": "AI",
                                        "line": ai_text, "turn_index": ai_idx}).encode(),
                            reliable=True,
                        )

        except Exception as e:
            print(f"[GeminiLive] Recv loop error: {e}", flush=True)
            import traceback; traceback.print_exc()


async def entrypoint(ctx):
    """livekit-agents entrypoint for the Gemini Live pipeline."""
    import logging
    logging.getLogger("livekit").setLevel(logging.ERROR)
    logging.getLogger("httpx").setLevel(logging.ERROR)

    print(f"[GeminiLive] entrypoint called, room={ctx.room.name}", flush=True)

    from google import genai
    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    agent = GeminiLiveAgent(ctx, genai_client)
    try:
        await agent.start()
    except Exception as e:
        import traceback
        print(f"[GeminiLive] FATAL error in start(): {e}", flush=True)
        traceback.print_exc()
        raise
    await asyncio.Future()  # keep alive
