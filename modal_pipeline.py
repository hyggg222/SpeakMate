import modal
import os

try:
    import livekit_plugins
except ImportError:
    pass

# 1. Define the container environment
# Using a standard NVIDIA CUDA image with Python 3.11
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "espeak-ng")
    .pip_install(
        "torch",
        "torchaudio",
        "faster-whisper",
        "fastapi",
        "python-multipart",
        "hf_transfer",
        "soundfile",
        "librosa",
        "viphoneme",
        "vinorm",
        "underthesea",
        "eng_to_ipa",
        "scipy",
        "nvidia-cublas-cu12",
        "google-genai",
        "livekit-agents",
        "livekit-plugins-google",
        "livekit-plugins-silero",
        "huggingface_hub"
    )
    .run_commands("git clone https://github.com/tronghieuit/valtec-tts.git /root/valtec-tts")
    .add_local_dir("livekit_plugins", "/root/livekit_plugins", copy=True)
    .env({
        "PYTHONPATH": "/root/valtec-tts:/root",
        "LD_LIBRARY_PATH": "/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib:/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib",
    })
)

from pydantic import BaseModel
from typing import Optional, List

class TranscriptionRequest(BaseModel):
    audio_base64: str

class GenerateRequest(BaseModel):
    text: str
    speaker: Optional[str] = "NF" # Ignored when using ZeroShotTTS voice clone

class ChatMessage(BaseModel):
    role: str
    line: str # Backend uses 'speaker' and 'line' in history

class InteractRequest(BaseModel):
    audio_base64: str
    scenario_str: str
    conversation_history_str: str # JSON string of history (List of {speaker: string, line: string})
    speaker: Optional[str] = "NF" # Ignored when using ZeroShotTTS voice clone
    user_name: Optional[str] = "bạn"

app = modal.App("speakmate-pipeline-v2")


def _download_zeroshot_model(model_dir: str):
    """Download Valtec ZeroShot checkpoint + config from HuggingFace into a flat directory."""
    if os.path.exists(os.path.join(model_dir, "config.json")) and any(
        f.startswith("G_") and f.endswith(".pth") for f in os.listdir(model_dir)
    ):
        print(f"[TTS] Using cached model from: {model_dir}")
        return

    from huggingface_hub import hf_hub_download
    import shutil

    os.makedirs(model_dir, exist_ok=True)
    repo_id = "valtecAI-team/valtec-zeroshot-voice-cloning"

    for fname in ["G_175000.pth", "config.json"]:
        dest = os.path.join(model_dir, fname)
        if not os.path.exists(dest):
            print(f"[TTS] Downloading {fname}...")
            downloaded = hf_hub_download(
                repo_id=repo_id,
                filename=f"pretrained/zeroshot/{fname}",
                repo_type="space",
            )
            shutil.copy2(downloaded, dest)

    print("[TTS] Download complete!")

# 2. Define the Unified Pipeline Class
@app.cls(
    image=image,
    gpu="L4", # Upgraded to L4 for better performance in 2026
    volumes={
        "/hf_cache": modal.Volume.from_name("speakmate-hf-cache", create_if_missing=True),
        "/valtec_models": modal.Volume.from_name("speakmate-valtec-models", create_if_missing=True)
    },
    secrets=[modal.Secret.from_name("gemini-api-key")],
    scaledown_window=600, 
)
class VoicePipeline:
    @modal.enter()
    def load_models(self):
        print("--- [Pipeline] Loading Models on L4 GPU ---")
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        
        # 1. Load Whisper for STT
        from faster_whisper import WhisperModel
        print("Initializing Whisper v3-Large...")
        self.stt_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
        
        # 2. Load Valtec-TTS ZeroShotTTS for Voice Cloning
        import sys
        if "/root/valtec-tts" not in sys.path:
            sys.path.append("/root/valtec-tts")

        from valtec_tts import ZeroShotTTS
        print("Initializing Valtec ZeroShotTTS (Voice Clone Mode)...")

        model_dir = "/valtec_models/zeroshot-hf"
        _download_zeroshot_model(model_dir)
        checkpoint = sorted([f for f in os.listdir(model_dir) if f.startswith("G_") and f.endswith(".pth")])[-1]
        self.tts_model = ZeroShotTTS(
            checkpoint_path=os.path.join(model_dir, checkpoint),
            config_path=os.path.join(model_dir, "config.json")
        )

        self.voice_ref_path = "/valtec_models/voice_clone/voice1.wav"
        if not os.path.exists(self.voice_ref_path):
            print(f"WARNING: Voice clone reference not found at {self.voice_ref_path}")
        
        # 3. Init Gemini
        from google import genai
        print("Initializing Gemini API Client...")
        self.genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        
        print("--- [Pipeline] Ready! ---")

    @staticmethod
    def _sanitize(text: str, user_name: str = "bạn") -> str:
        """Strip bracketed placeholders from LLM output."""
        import re
        result = re.sub(r'\[(?:tên của bạn|tên bạn|tên người dùng|your name|tên|name|họ tên|user name|người dùng)[^\]]*\]', user_name, text, flags=re.IGNORECASE)
        result = re.sub(r'\[[^\]]{1,40}\]', '', result)
        return re.sub(r'\s{2,}', ' ', result).strip()

    @modal.fastapi_endpoint(method="POST")
    async def interact(self, request: InteractRequest):
        import base64, tempfile, json, io, soundfile as sf
        
        # 1. STT Phase
        audio_bytes = base64.b64decode(request.audio_base64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        try:
            print(f"[Interact] 1. STT Transcribing...")
            segments, _ = self.stt_model.transcribe(tmp_path, language="vi", beam_size=5, vad_filter=True)
            transcript = " ".join([seg.text.strip() for seg in segments])
            
            if not transcript.strip():
                transcript = "(Không nghe rõ)"
                ai_response = "Xin lỗi, Ni chưa nghe thấy bạn nói gì. Bạn có thể nói lại được không?"
            else:
                # 2. LLM Phase
                print(f"[Interact] 2. LLM Reasoning for: {transcript[:30]}...")
                scenario = json.loads(request.scenario_str)
                history = json.loads(request.conversation_history_str)
                
                user_name = request.user_name or 'bạn'
                persona = scenario.get('interviewerPersona', 'Người hướng dẫn')
                goals = ', '.join(scenario.get('goals', []))
                starting_turns = scenario.get('startingTurns', [])
                system_prompt = (
                    f"Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.\n"
                    f"Nhân vật của bạn: {persona}\n"
                    f"Mục tiêu: {goals}\n"
                    f"Người bạn đang nói chuyện tên là: {user_name}\n\n"
                    f"Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.\n"
                    f"Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).\n"
                    f"Hết sức tự nhiên như đang nói chuyện trực tiếp.\n"
                    f"TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder.\n"
                    f"Luôn dùng tên \"{user_name}\" hoặc \"bạn\".\n\n"
                    f"Bối cảnh kịch bản: {json.dumps(starting_turns, ensure_ascii=False)}"
                )
                
                messages = []
                for h in history:
                    messages.append({
                        "role": "model" if h['speaker'] == 'AI' else "user",
                        "parts": [{"text": h['line']}]
                    })
                messages.append({"role": "user", "parts": [{"text": transcript}]})
                
                # Filter out leading model messages if any
                while messages and messages[0]['role'] == 'model':
                    messages.pop(0)

                response = self.genai_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=messages,
                    config={"system_instruction": system_prompt}
                )
                ai_response = self._sanitize(response.text, request.user_name or 'bạn')

            # 3. TTS Phase (Voice Clone)
            print(f"[Interact] 3. TTS Generating (Voice Clone): {ai_response[:30]}...")
            audio_obj, sr = self.tts_model.synthesize(ai_response, reference_audio=self.voice_ref_path)
            
            buffer = io.BytesIO()
            sf.write(buffer, audio_obj, sr, format="WAV") 
            buffer.seek(0)
            
            return {
                "userTranscript": transcript,
                "aiResponse": ai_response,
                "botAudioUrl": f"data:audio/wav;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"
            }
            
        except Exception as e:
            print(f"[Interact] Error: {e}")
            return {"error": str(e)}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @modal.fastapi_endpoint(method="POST")
    async def transcribe(self, request_data: TranscriptionRequest):
        import base64, tempfile
        audio_bytes = base64.b64decode(request_data.audio_base64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            segments, info = self.stt_model.transcribe(tmp_path, language="vi", beam_size=5, vad_filter=True)
            transcript = " ".join([seg.text.strip() for seg in segments])
            return {"transcript": transcript}
        finally:
            if os.path.exists(tmp_path): os.unlink(tmp_path)

    @modal.fastapi_endpoint(method="POST")
    async def generate(self, request_data: GenerateRequest):
        import io, base64, soundfile as sf
        audio_obj, sr = self.tts_model.synthesize(request_data.text, reference_audio=self.voice_ref_path)
        buffer = io.BytesIO()
        sf.write(buffer, audio_obj, sr, format="WAV")
        buffer.seek(0)
        return {"audio_base64": base64.b64encode(buffer.read()).decode("utf-8")}

@app.cls(
    image=image,
    gpu="L4",
    memory=16384,
    volumes={
        "/hf_cache": modal.Volume.from_name("speakmate-hf-cache", create_if_missing=True),
        "/valtec_models": modal.Volume.from_name("speakmate-valtec-models", create_if_missing=True)
    },
    secrets=[modal.Secret.from_name("gemini-api-key"), modal.Secret.from_name("livekit-keys")],
    scaledown_window=600,
    timeout=86400,
)
class LiveKitAgentWorker:
    @modal.enter()
    def load_models(self):
        """Pre-download models so subprocess loads are fast (cached on volume)."""
        import sys, io
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        _real_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            _download_zeroshot_model("/valtec_models/zeroshot-hf")
        finally:
            sys.stdout = _real_stdout

    @modal.method()
    def run(self):
        import sys
        import os
        import logging
        import warnings

        # Silence all library loggers — only our print() statements show
        logging.getLogger("livekit.agents").setLevel(logging.ERROR)
        logging.getLogger("livekit").setLevel(logging.ERROR)
        for name in ("hpack", "httpcore", "httpx", "huggingface_hub", "huggingface_hub.utils._http"):
            logging.getLogger(name).setLevel(logging.ERROR)
        warnings.filterwarnings("ignore", category=FutureWarning)
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

        print("Starting LiveKit Agent Worker...", flush=True)
        sys.argv = ['modal_livekit', 'start']

        # Prevent typer's sys.exit(0) from killing Modal container
        _real_exit = sys.exit
        sys.exit = lambda code=0: (_ for _ in ()).throw(SystemExit(code)) if code != 0 else None

        from livekit import agents
        try:
            agents.cli.run_app(
                agents.WorkerOptions(
                    entrypoint_fnc=_livekit_entrypoint,
                    prewarm_fnc=_livekit_prewarm,
                    num_idle_processes=1,
                    initialize_process_timeout=120,
                )
            )
        except SystemExit as e:
            if e.code != 0:
                sys.exit = _real_exit
                raise
        finally:
            sys.exit = _real_exit

        print("LiveKit agent exited cleanly.", flush=True)


def _extract_text(content) -> str:
    """Extract plain string from livekit-agents ChatMessage.content (which is a list in v1.5.2)."""
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


def _livekit_prewarm(proc: object):
    """Called in each agent subprocess to load models before any job arrives."""
    import sys
    import os
    import logging
    import warnings
    import traceback

    try:
        # Silence all library noise in subprocess
        logging.getLogger().setLevel(logging.ERROR)
        warnings.filterwarnings("ignore")
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
        os.environ["HF_HUB_CACHE"] = "/hf_cache"

        if "/root/valtec-tts" not in sys.path:
            sys.path.append("/root/valtec-tts")

        from faster_whisper import WhisperModel
        from valtec_tts import ZeroShotTTS
        import io

        print("[LiveKit] Loading models...", flush=True)

        # Mute library prints (valtec_tts, SpeakerEncoder, etc.) during loading
        _real_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            proc.userdata["stt_model"] = WhisperModel("large-v3", device="cuda", compute_type="float16")

            model_dir = "/valtec_models/zeroshot-hf"
            _download_zeroshot_model(model_dir)

            ckpts = [f for f in os.listdir(model_dir) if f.startswith("G_") and f.endswith(".pth")]
            if not ckpts:
                raise RuntimeError(f"No checkpoint found in {model_dir}")

            ckpt = sorted(ckpts)[-1]
            proc.userdata["tts_model"] = ZeroShotTTS(
                checkpoint_path=os.path.join(model_dir, ckpt),
                config_path=os.path.join(model_dir, "config.json"),
            )
        finally:
            sys.stdout = _real_stdout

        voice_ref = "/valtec_models/voice_clone/voice1.wav"
        if not os.path.exists(voice_ref):
            print(f"[LiveKit] WARNING: voice ref NOT FOUND: {voice_ref}", flush=True)
        proc.userdata["voice_ref"] = voice_ref
        print("[LiveKit] Ready.", flush=True)
        
    except Exception as e:
        print(f"[LiveKit Subprocess] CRITICAL ERROR during prewarm: {e}", flush=True)
        traceback.print_exc()
        # We don't re-raise here to prevent infinite crash loop if possible, 
        # or we let it crash but with a clear error message.
        raise e


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
        self.ctx.room.on("track_subscribed", self.on_track_subscribed)

    async def start(self):
        import asyncio, json
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

        # Create AudioSource with correct rate, then connect and publish track
        self.audio_source = rtc.AudioSource(self.tts_sr, 1)
        await self.ctx.connect()
        track = rtc.LocalAudioTrack.create_audio_track("agent-mic", self.audio_source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        pub = await self.ctx.room.local_participant.publish_track(track, options)
        print(f"[Bridge] Audio track published: {pub.sid}", flush=True)

        # Wait for participant and parse scenario metadata from token
        participant = await self.ctx.wait_for_participant()
        print(f"[Bridge] Participant joined: {participant.identity}", flush=True)
        try:
            meta = json.loads(participant.metadata or "{}")
            self.scenario  = meta.get("scenario", {})
            self.history   = meta.get("history", [])
            self.user_name = meta.get("userName", "bạn")
        except Exception as e:
            print(f"[Bridge] Metadata parse error: {e}", flush=True)
        print(f"[Bridge] Ready. User: {self.user_name}", flush=True)

    def on_track_subscribed(self, track_recv, publication_recv, participant_recv):
        import asyncio
        from livekit import rtc
        if track_recv.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"[Bridge] Subscribed to audio from {participant_recv.identity}", flush=True)
            asyncio.create_task(self._handle_audio_track(track_recv, participant_recv.identity))

    async def _handle_audio_track(self, track_recv, participant_identity):
        import asyncio
        from livekit import agents, rtc
        # sample_rate=16000 forces the SDK to resample Opus/48kHz → 16kHz mono
        # which is the format Silero VAD requires
        audio_stream = rtc.AudioStream(track_recv, sample_rate=16000, num_channels=1)
        self.vad_stream = self.vad.stream()
        frame_count = 0

        async def _vad_event_loop():
            try:
                async for vad_event in self.vad_stream:
                    if vad_event.type == agents.vad.VADEventType.START_OF_SPEECH:
                        print("[VAD] Speech start", flush=True)
                        self.is_user_speaking = True
                        self.audio_buffer = []
                    elif vad_event.type == agents.vad.VADEventType.END_OF_SPEECH:
                        print(f"[VAD] Speech end. {len(self.audio_buffer)} frames", flush=True)
                        self.is_user_speaking = False
                        if self.audio_buffer:
                            asyncio.create_task(self._process_user_turn(list(self.audio_buffer)))
                        self.audio_buffer = []
            except Exception as e:
                print(f"[VAD] Loop error: {e}", flush=True)

        self.vad_task = asyncio.create_task(_vad_event_loop())
        try:
            async for event in audio_stream:
                # livekit-python ≥0.12 wraps frames in AudioFrameEvent(.frame)
                # older versions yield AudioFrame directly — handle both
                frame = event.frame if hasattr(event, 'frame') else event
                frame_count += 1
                try:
                    self.vad_stream.push_frame(frame)
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
        import asyncio, io, json
        import numpy as np
        import soundfile as sf
        import librosa
        from livekit import rtc

        print(f"[Bridge] Processing {len(frames)} frames...", flush=True)

        # ── STT ──────────────────────────────────────────────────────
        raw_bytes = b"".join(f.data for f in frames)
        input_sr  = frames[0].sample_rate  # typically 48000
        audio_f32 = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32767.0
        if input_sr != 16000:
            audio_f32 = librosa.resample(audio_f32, orig_sr=input_sr, target_sr=16000)
        wav_buf = io.BytesIO()
        sf.write(wav_buf, audio_f32, 16000, format="WAV", subtype="FLOAT")
        wav_buf.seek(0)

        def _transcribe():
            segs, _ = self.stt_model.transcribe(wav_buf, language="vi", beam_size=5, vad_filter=False)
            return " ".join(s.text.strip() for s in segs).strip()

        transcript = await asyncio.to_thread(_transcribe)
        print(f"[STT] '{transcript}'", flush=True)
        if not transcript:
            return

        # Send user transcript to frontend via data channel
        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "transcript", "speaker": "User", "line": transcript}).encode(),
            reliable=True
        )

        # ── LLM ──────────────────────────────────────────────────────
        persona        = self.scenario.get("interviewerPersona", "Người hướng dẫn")
        goals          = ", ".join(self.scenario.get("goals", []))
        starting_turns = self.scenario.get("startingTurns", [])
        system_prompt  = (
            f"Bạn là đối tác hội thoại trong một kịch bản luyện tập giao tiếp.\n"
            f"Nhân vật của bạn: {persona}\n"
            f"Mục tiêu: {goals}\n"
            f"Người bạn đang nói chuyện tên là: {self.user_name}\n\n"
            f"Tuân thủ nghiêm ngặt nhân vật. Không thoát vai.\n"
            f"Trả lời cực kỳ ngắn gọn (tối đa 2 câu, dưới 20 từ).\n"
            f"Hết sức tự nhiên như đang nói chuyện trực tiếp.\n"
            f"TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [] hoặc placeholder.\n"
            f"Luôn dùng tên \"{self.user_name}\" hoặc \"bạn\".\n\n"
            f"Bối cảnh kịch bản: {json.dumps(starting_turns, ensure_ascii=False)}"
        )

        messages = [
            {"role": "model" if h["speaker"] == "AI" else "user",
             "parts": [{"text": h["line"]}]}
            for h in self.history
        ]
        messages.append({"role": "user", "parts": [{"text": transcript}]})
        while messages and messages[0]["role"] == "model":
            messages.pop(0)

        def _llm_call():
            r = self.genai_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=messages,
                config={"system_instruction": system_prompt}
            )
            return r.text

        ai_text = self._sanitize(await asyncio.to_thread(_llm_call), self.user_name)
        print(f"[LLM] '{ai_text}'", flush=True)

        self.history.append({"speaker": "User", "line": transcript})
        self.history.append({"speaker": "AI",   "line": ai_text})

        # Send AI response to frontend via data channel
        await self.ctx.room.local_participant.publish_data(
            json.dumps({"type": "transcript", "speaker": "AI", "line": ai_text}).encode(),
            reliable=True
        )

        # ── TTS ──────────────────────────────────────────────────────
        if not os.path.exists(self.voice_ref):
            print(f"[Bridge] WARNING: voice_ref missing: {self.voice_ref}", flush=True)
            return

        def _synthesize():
            return self.tts_model.synthesize(ai_text, reference_audio=self.voice_ref)

        audio_np, sr = await asyncio.to_thread(_synthesize)
        audio_f32_tts = np.array(audio_np, dtype=np.float32)
        peak = np.abs(audio_f32_tts).max()
        if peak > 0:
            audio_f32_tts = np.clip(audio_f32_tts / peak * 0.95, -1.0, 1.0)
        audio_i16 = (audio_f32_tts * 32767).astype(np.int16)

        spf = int(sr * 0.02)  # samples per 20ms frame
        for i in range(0, len(audio_i16), spf):
            chunk = audio_i16[i:i + spf]
            if len(chunk) < spf:
                chunk = np.pad(chunk, (0, spf - len(chunk)))
            await self.audio_source.capture_frame(rtc.AudioFrame(
                data=chunk.tobytes(), sample_rate=sr,
                num_channels=1, samples_per_channel=spf
            ))
        print(f"[TTS] Streamed {len(audio_i16)} samples @ {sr}Hz", flush=True)


async def _livekit_entrypoint(ctx):
    """Module-level entrypoint (picklable) for LiveKit agent jobs."""
    import asyncio, os
    from livekit import agents, rtc
    from livekit.plugins import silero
    from google import genai

    stt_model    = ctx.proc.userdata["stt_model"]
    tts_model    = ctx.proc.userdata["tts_model"]
    voice_ref    = ctx.proc.userdata["voice_ref"]
    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    vad_model    = silero.VAD.load()

    agent = ManualBridgeAgent(ctx, vad_model, stt_model, tts_model, voice_ref, genai_client)
    await agent.start()
    await asyncio.Future()  # keep alive until framework cancels



@app.local_entrypoint()
def test():
    print("SpeakMate Modal App loaded. Use 'modal serve modal_pipeline.py' for development.")
