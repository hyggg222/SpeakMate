"""
ManualBridgeAgent — LiveKit real-time voice pipeline.
VAD → STT → LLM → TTS, with turn persistence via Internal API.
"""
import os
import asyncio
import json


MAX_RECENT_TURNS = 6


def _extract_text(content) -> str:
    """Extract plain string from livekit-agents ChatMessage.content (list in v1.5.2)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
            elif hasattr(item, "text"):
                parts.append(str(item.text))
        return " ".join(parts).strip()
    return str(content)


class ManualBridgeAgent:
    def __init__(self, ctx, vad_model, stt_model, tts_model, voice_ref, genai_client):
        self.ctx = ctx
        self.vad = vad_model
        self.stt_model = stt_model
        self.tts_model = tts_model
        self.voice_ref = voice_ref
        self.genai_client = genai_client
        self.audio_source = None        # created in start() after TTS warm-up
        self.tts_sr = 22050             # overwritten in start()
        self.audio_buffer = []
        self.is_user_speaking = False
        self.vad_stream = None
        self.vad_task = None
        self.scenario = {}
        self.history = []
        self.user_name = "bạn"
        self.system_prompt = ""
        self.session_id = ""
        self.turn_counter = 0
        self.context_summary = ""
        self._current_tts_task: asyncio.Task | None = None
        self._tts_cancelled = False
        self._current_ai_turn_idx: int = -1
        self._chars_delivered: int = 0
        self.ctx.room.on("track_subscribed", self.on_track_subscribed)

    async def start(self):
        from livekit import rtc

        # Warm-up TTS to discover sample rate (also pre-loads CUDA kernels)
        print("[Bridge] Warming up TTS...", flush=True)
        try:
            def _warmup():
                _, sr = self.tts_model.synthesize("Xin chào.", reference_audio=self.voice_ref)
                return sr
            self.tts_sr = await asyncio.to_thread(_warmup)
        except Exception as e:
            print(f"[Bridge] TTS warm-up failed ({e}), defaulting to 22050 Hz", flush=True)
            self.tts_sr = 22050
        print(f"[Bridge] TTS sample rate: {self.tts_sr}", flush=True)

        # Create AudioSource, connect, publish track
        self.audio_source = rtc.AudioSource(self.tts_sr, 1)
        await self.ctx.connect()
        track = rtc.LocalAudioTrack.create_audio_track("agent-mic", self.audio_source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        pub = await self.ctx.room.local_participant.publish_track(track, options)
        print(f"[Bridge] Audio track published: {pub.sid}", flush=True)

        # Wait for participant, fetch session context from Internal API
        participant = await self.ctx.wait_for_participant()
        print(f"[Bridge] Participant joined: {participant.identity}", flush=True)
        try:
            meta = json.loads(participant.metadata or "{}")
            meta_version = meta.get("v", 1)

            if meta_version >= 2:
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
                        self.scenario      = ctx_data.get("scenario", {})
                        self.history       = ctx_data.get("history", [])
                        self.user_name     = ctx_data.get("userName", "bạn")
                        self.system_prompt = ctx_data.get("systemPrompt", "")
                        print(f"[Bridge] Context fetched: {len(self.history)} turns, user={self.user_name}", flush=True)
                    else:
                        print(f"[Bridge] Context fetch HTTP {resp.status_code}: {resp.text[:200]}", flush=True)
                else:
                    print(f"[Bridge] Missing session_id or BACKEND_URL — session_id={session_id!r}", flush=True)
            else:
                # Legacy v1 metadata
                self.scenario  = meta.get("scenario", {})
                self.history   = meta.get("history", [])
                self.user_name = meta.get("userName", "bạn")
                print(f"[Bridge] Legacy metadata (v1). User: {self.user_name}", flush=True)
        except Exception as e:
            print(f"[Bridge] Context fetch error: {e}", flush=True)
            import traceback; traceback.print_exc()

        if not self.system_prompt:
            self.system_prompt = self._build_system_prompt()
        print(f"[Bridge] Ready. User: {self.user_name}", flush=True)

        # Signal frontend to unblock the loading overlay
        try:
            print("[Bridge] Sending agent_ready...", flush=True)
            await self.ctx.room.local_participant.publish_data(
                json.dumps({"type": "agent_ready"}).encode(),
                reliable=True
            )
            print("[Bridge] agent_ready sent.", flush=True)
        except Exception as e:
            print(f"[Bridge] agent_ready send FAILED: {e}", flush=True)

    def _build_system_prompt(self) -> str:
        """Fallback: build system prompt inline from self.scenario."""
        persona        = self.scenario.get("interviewerPersona", "Người hướng dẫn")
        goals          = ", ".join(self.scenario.get("goals", []))
        starting_turns = self.scenario.get("startingTurns", [])
        return (
            f"Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.\n"
            f"Nhân vật của bạn: {persona}\n"
            f"Mục tiêu: {goals}\n"
            f"Người bạn đang nói chuyện tên là: {self.user_name}\n\n"
            f"Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.\n"
            f"Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).\n"
            f"Hết sức tự nhiên như đang nói chuyện trực tiếp.\n"
            f"TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder.\n"
            f"Luôn dùng tên \"{self.user_name}\" hoặc \"bạn\".\n\n"
            f"QUY TẮC QUAN TRỌNG: Nếu nội dung người dùng nói không rõ ràng, mâu thuẫn trực tiếp với bối cảnh ({persona}) hoặc không thể hiểu được, hãy lịch sự trả lời rằng bạn không hiểu hoặc đề nghị người dùng lặp lại bằng tiếng Anh/Việt. Tuyệt đối không tự suy đoán hoặc sáng tạo nội dung không liên quan.\n\n"
            f"Bối cảnh kịch bản: {json.dumps(starting_turns, ensure_ascii=False)}"
        )

    def _build_messages(self, transcript: str) -> list[dict]:
        """Build the list of messages for Gemini including summary and sliding window."""
        recent = self.history[-MAX_RECENT_TURNS:]
        messages = []
        
        if self.context_summary:
            messages.append({"role": "user", "parts": [{"text": f"[Tóm tắt hội thoại trước]: {self.context_summary}"}]})
            messages.append({"role": "model", "parts": [{"text": "Hiểu rồi."}]})
        
        for h in recent:
            messages.append({
                "role": "model" if h["speaker"] == "AI" else "user",
                "parts": [{"text": h["line"]}]
            })
            
        messages.append({"role": "user", "parts": [{"text": transcript}]})
        
        # Guard: Gemini requires user message first if history exists
        while messages and messages[0]["role"] == "model":
            messages.pop(0)
            
        return messages

    async def _maybe_summarize(self):
        """Check if we should trigger background summarization."""
        # Summarize every 12 turns (6 user + 6 AI)
        if len(self.history) % 12 == 0 and len(self.history) >= 12:
            asyncio.create_task(self._background_summarize())

    async def _background_summarize(self):
        """Perform background summarization of old turns."""
        old_turns = self.history[:-MAX_RECENT_TURNS]
        if not old_turns:
            return
            
        summary_prompt = (
            "Tóm tắt ngắn gọn cực kỳ (tối đa 2 câu) nội dung chính "
            "của cuộc hội thoại sau để làm ngữ cảnh tiếp theo:\n\n" +
            "\n".join(f"{t['speaker']}: {t['line']}" for t in old_turns)
        )
        
        def _call():
            r = self.genai_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[{"role": "user", "parts": [{"text": summary_prompt}]}]
            )
            return r.text
            
        try:
            self.context_summary = await asyncio.to_thread(_call)
            print(f"[Bridge] Context summarized: {self.context_summary[:80]}...", flush=True)
        except Exception as e:
            print(f"[Bridge] Summarize failed (non-fatal): {e}", flush=True)

    async def _persist_turn(self, turn_index: int, speaker: str, line: str):
        """POST turn data to backend Internal API for DB persistence."""
        backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
        internal_key = os.environ.get("INTERNAL_API_KEY", "")
        if not backend_url or not self.session_id:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{backend_url}/api/internal/turns",
                    headers={"Authorization": f"Bearer {internal_key}"},
                    json={
                        "session_id": self.session_id,
                        "turn_index": turn_index,
                        "speaker": speaker,
                        "line": line,
                    },
                )
            if resp.status_code == 200:
                print(f"[Persist] turn {turn_index} ({speaker}) saved", flush=True)
                # Signal confirmation to frontend for Task 5: Optimistic UI
                try:
                    await self.ctx.room.local_participant.publish_data(
                        json.dumps({"type": "turn_confirmed", "turn_index": turn_index}).encode(),
                        reliable=True
                    )
                except Exception as e:
                    print(f"[Persist] failed to signal confirmation: {e}", flush=True)
            else:
                print(f"[Persist] turn {turn_index} failed: HTTP {resp.status_code}", flush=True)
        except Exception as e:
            print(f"[Persist] turn {turn_index} error: {e}", flush=True)

    def on_track_subscribed(self, track_recv, publication_recv, participant_recv):
        from livekit import rtc
        if track_recv.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"[Bridge] Subscribed to audio from {participant_recv.identity}", flush=True)
            asyncio.create_task(self._handle_audio_track(track_recv, participant_recv.identity))

    async def _handle_audio_track(self, track_recv, participant_identity):
        from livekit import agents, rtc
        audio_stream = rtc.AudioStream(track_recv, sample_rate=16000, num_channels=1)
        self.vad_stream = self.vad.stream()
        frame_count = 0

        async def _vad_finalize():
            await asyncio.sleep(2.0) # Wait 2.0s before deciding speech ended
            if not self.is_user_speaking and self.audio_buffer:
                print(f"[VAD] Speech finalize. {len(self.audio_buffer)} frames", flush=True)
                asyncio.create_task(self._process_user_turn(list(self.audio_buffer)))
                self.audio_buffer = []

        async def _vad_event_loop():
            try:
                async for vad_event in self.vad_stream:
                    if vad_event.type == agents.vad.VADEventType.START_OF_SPEECH:
                        print("[VAD] Speech start", flush=True)
                        if self._current_tts_task and not self._current_tts_task.done():
                            print("[Bridge] Barge-in detected! Cancelling TTS...", flush=True)
                            self._tts_cancelled = True
                            self._current_tts_task.cancel()
                            asyncio.create_task(self._signal_ai_interrupted())
                        
                        self.is_user_speaking = True
                        if hasattr(self, '_vad_timeout_task') and self._vad_timeout_task:
                            self._vad_timeout_task.cancel()
                            self._vad_timeout_task = None
                            
                        # Only reset buffer if it's been processed, otherwise keep accumulating
                        if not self.audio_buffer:
                            pass

                    elif vad_event.type == agents.vad.VADEventType.END_OF_SPEECH:
                        print("[VAD] Silence detected, waiting to finalize...", flush=True)
                        self.is_user_speaking = False
                        if hasattr(self, '_vad_timeout_task') and self._vad_timeout_task:
                            self._vad_timeout_task.cancel()
                        self._vad_timeout_task = asyncio.create_task(_vad_finalize())
            except Exception as e:
                print(f"[VAD] Loop error: {e}", flush=True)

        self.vad_task = asyncio.create_task(_vad_event_loop())
        try:
            async for event in audio_stream:
                frame = event.frame if hasattr(event, 'frame') else event
                frame_count += 1
                # Increase VAD sensitivity by applying a gain before detection
                # Convert to int16, apply gain, then clip
                audio_data = np.frombuffer(frame.data, dtype=np.int16)
                boosted_data = np.clip(audio_data.astype(np.float32) * 1.2, -32768, 32767).astype(np.int16)
                
                # Create a new frame for VAD (not for processing later, just for VAD)
                boosted_frame = rtc.AudioFrame(
                    data=boosted_data.tobytes(),
                    sample_rate=frame.sample_rate,
                    num_channels=frame.num_channels,
                    samples_per_channel=frame.samples_per_channel
                )
                
                try:
                    self.vad_stream.push_frame(boosted_frame)
                except Exception as e:
                    print(f"[VAD] push_frame error: {e}", flush=True)
                if self.is_user_speaking:
                    self.audio_buffer.append(frame)
        finally:
            print(f"[Bridge] Audio stream from {participant_identity} closed. Total frames: {frame_count}", flush=True)
            if self.vad_stream: self.vad_stream.close()
            if self.vad_task:   self.vad_task.cancel()

    @staticmethod
    def _sanitize(text: str, user_name: str = "bạn") -> str:
        import re
        result = re.sub(
            r'\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]',
            user_name, text, flags=re.IGNORECASE
        )
        result = re.sub(r'\[[^\]]{1,40}\]', '', result)
        return re.sub(r'\s{2,}', ' ', result).strip()

    async def _process_user_turn(self, frames):
        import io
        import numpy as np
        import soundfile as sf
        import librosa
        from livekit import rtc

        print(f"[Bridge] Processing {len(frames)} frames...", flush=True)

        # STT
        raw_bytes = b"".join(f.data for f in frames)
        input_sr  = frames[0].sample_rate
        audio_f32 = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32767.0
        if input_sr != 16000:
            audio_f32 = librosa.resample(audio_f32, orig_sr=input_sr, target_sr=16000)

        rms = np.sqrt(np.mean(audio_f32 ** 2))
        if rms > 1e-6:
            gain = min(0.1 / rms, 10.0)
            audio_f32 = np.clip(audio_f32 * gain, -1.0, 1.0)

        wav_buf = io.BytesIO()
        sf.write(wav_buf, audio_f32, 16000, format="WAV", subtype="FLOAT")
        wav_buf.seek(0)

        prompt_texts = []
        if self.context_summary:
            prompt_texts.append(self.context_summary)
        # Take the last 2 lines for immediate context
        for h in self.history[-2:]:
            prompt_texts.append(h["line"])
        whisper_prompt = " ".join(prompt_texts).strip()

        def _transcribe():
            segs, _ = self.stt_model.transcribe(
                wav_buf,
                language="vi",
                beam_size=5,
                vad_filter=False,
                no_speech_threshold=0.5,
                log_prob_threshold=-1.0,
                compression_ratio_threshold=2.4,
                condition_on_previous_text=False,
                temperature=[0.0, 0.2],
                initial_prompt=whisper_prompt if whisper_prompt else None,
            )
            return " ".join(s.text.strip() for s in segs).strip()

        transcript = await asyncio.to_thread(_transcribe)
        print(f"[STT] '{transcript}'", flush=True)
        if not transcript:
            return

        user_turn_idx = self.turn_counter
        ai_turn_idx   = self.turn_counter + 1
        self.turn_counter += 2

        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "transcript", "speaker": "User", "line": transcript, "turn_index": user_turn_idx}).encode(),
            reliable=True
        )
        asyncio.create_task(self._persist_turn(user_turn_idx, "User", transcript))

        # LLM
        messages = self._build_messages(transcript)

        def _llm_call():
            r = self.genai_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=messages,
                config={"system_instruction": self.system_prompt}
            )
            return r.text

        ai_text = self._sanitize(await asyncio.to_thread(_llm_call), self.user_name)
        print(f"[LLM] '{ai_text}'", flush=True)

        self.history.append({"speaker": "User", "line": transcript})
        # AI turn will be appended AFTER streaming (to handle truncation if interrupted)
        # self.history.append({"speaker": "AI",   "line": ai_text})
        await self._maybe_summarize()

        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "transcript", "speaker": "AI", "line": ai_text, "turn_index": ai_turn_idx}).encode(),
            reliable=True
        )
        asyncio.create_task(self._persist_turn(ai_turn_idx, "AI", ai_text))

        # TTS
        if not os.path.exists(self.voice_ref):
            print(f"[Bridge] WARNING: voice_ref missing: {self.voice_ref}", flush=True)
            return

        def _synthesize():
            return self.tts_model.synthesize(ai_text, reference_audio=self.voice_ref)

        audio_np, sr = await asyncio.to_thread(_synthesize)
        
        if audio_np is None or len(audio_np) == 0:
            print("[Bridge] WARNING: TTS model returned empty audio.", flush=True)
            # Append AI line to history to not break the turn sequence
            self.history.append({"speaker": "AI", "line": ai_text})
            return

        audio_f32_tts = np.array(audio_np, dtype=np.float32)
        peak = np.abs(audio_f32_tts).max() if len(audio_f32_tts) > 0 else 0
        if peak > 0:
            audio_f32_tts = np.clip(audio_f32_tts / peak * 0.95, -1.0, 1.0)
        audio_i16 = (audio_f32_tts * 32767).astype(np.int16)

        # Set tracking state
        self._current_ai_turn_idx = ai_turn_idx
        self._chars_delivered = 0
        self._tts_cancelled = False

        # Streaming (cancellable)
        self._current_tts_task = asyncio.create_task(
            self._stream_tts(ai_text, sr, audio_i16)
        )
        try:
            await self._current_tts_task
            # If successfully finished, append full text
            self.history.append({"speaker": "AI", "line": ai_text})
        except asyncio.CancelledError:
            # Handle barge-in: truncate text based on chars delivered
            truncated_text = ai_text[:self._chars_delivered].strip()
            # If truncated at a word boundary, that's better, but char-based is a start.
            # Let's try to truncate at last space.
            last_space = truncated_text.rfind(' ')
            if last_space > 0:
                truncated_text = truncated_text[:last_space].strip()
            
            if not truncated_text:
                truncated_text = "..."
            
            print(f"[Bridge] TTS truncated: '{truncated_text}'", flush=True)
            self.history.append({"speaker": "AI", "line": truncated_text})
        finally:
            self._current_tts_task = None

    async def _stream_tts(self, ai_text: str, sr: int, audio_i16):
        """Stream audio frames to LiveKit with delivery tracking."""
        from livekit import rtc
        import numpy as np
        
        spf = int(sr * 0.02)
        total_frames = max(len(audio_i16) / spf, 1)
        chars_per_frame = len(ai_text) / total_frames
        
        for i in range(0, len(audio_i16), spf):
            chunk = audio_i16[i:i + spf]
            if len(chunk) < spf:
                chunk = np.pad(chunk, (0, spf - len(chunk)))
            
            await self.audio_source.capture_frame(rtc.AudioFrame(
                data=chunk.tobytes(), sample_rate=sr,
                num_channels=1, samples_per_channel=spf
            ))
            
            self._chars_delivered = int((i / spf) * chars_per_frame)
            # Minimal sleep to yield to event loop for cancellation
            await asyncio.sleep(0)
            
        print(f"[TTS] Streamed {len(audio_i16)} samples @ {sr}Hz", flush=True)

    async def _signal_ai_interrupted(self):
        """Signal interruption to frontend and mark in DB."""
        try:
            await self.ctx.room.local_participant.publish_data(
                json.dumps({"type": "ai_interrupted"}).encode(),
                reliable=True
            )
            if self._current_ai_turn_idx >= 0:
                turn_number = (self._current_ai_turn_idx // 2) + 1
                asyncio.create_task(self._mark_turn_interrupted(turn_number, self._chars_delivered))
        except Exception as e:
            print(f"[Bridge] signal interrupted error: {e}", flush=True)

    async def _mark_turn_interrupted(self, turn_number: int, delivered_chars: int):
        """PATCH Internal API to mark turn as interrupted."""
        backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
        internal_key = os.environ.get("INTERNAL_API_KEY", "")
        if not backend_url or not self.session_id:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.patch(
                    f"{backend_url}/api/internal/turns/{turn_number}/interrupted",
                    headers={"Authorization": f"Bearer {internal_key}"},
                    json={"session_id": self.session_id, "delivered_chars": delivered_chars},
                )
        except Exception as e:
            print(f"[Persist] mark interrupted error: {e}", flush=True)
