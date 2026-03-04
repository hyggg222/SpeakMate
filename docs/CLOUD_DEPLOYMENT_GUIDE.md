# SpeakMate AI Unified Pipeline: Cloud Deployment Guide (2026)

This guide documents the final architecture, deployment steps, and troubleshooting history for the SpeakMate Voice Pipeline.

## 1. Architecture Overview
The system uses a **Unified Cloud Pipeline** model to minimize latency (< 3s) and bypass local connectivity issues:
- **Cloud (Modal)**: Handles STT (Whisper), LLM (Gemini), and TTS (Valtec) in a single GPU container (NVIDIA L4).
- **Backend (Node.js)**: Orchestrates the request by sending audio and scenario data to Modal and receiving the final AI response + Audio.

## 2. Deployment Steps

### Prerequisites
- [Modal.com](https://modal.com) account.
- Google Gemini API Key.

### Step A: Configure Modal Secrets
You must provide your Gemini API key to the Cloud environment:
```bash
modal secret create gemini-api-key GEMINI_API_KEY=YOUR_GEMINI_KEY
```

### Step B: Prepare Persistent Volumes
The pipeline uses two volumes for zero-latency loading:
1. `speakmate-hf-cache`: Stores Whisper model weights.
2. `speakmate-valtec-models`: Stores Valtec-TTS pre-trained weights.
*Note: These are created automatically on the first run if they don't exist.*

### Step C: Deploy to Cloud
From the root directory, run:
```bash
modal deploy modal_pipeline.py
```
This will create a permanent production endpoint. For development/testing, use `modal serve modal_pipeline.py`.

## 3. Major Bugs & Solutions

| Bug Encountered | Root Cause | Solution/Fix |
| :--- | :--- | :--- |
| `libcubart.so.12 not found` | Default Modal image (debian_slim) lacks the latest CUDA runtime for Whisper v3. | Added `nvidia-cublas-cu12` and `nvidia-cudnn-cu12` to `pip_install` and configured `LD_LIBRARY_PATH`. |
| `ModuleNotFoundError: valtec_tts` | Script couldn't find the cloned repository inside the container. | Added `/root/valtec-tts` to `sys.path` and configured `PYTHONPATH` in the environment. |
| `viphoneme [WinError 193]` | `viphoneme` relies on `.so` Linux binary files, which don't work on Windows. | Offloaded all TTS processing to the Linux-based Modal container. |
| `UND_ERR_CONNECT_TIMEOUT` | Node.js (local) attempted Gemini calls via IPv6, causing 10s timeouts. | Moved the Gemini LLM reasoning step into the Modal Cloud pipeline (Unified Flow). |
| Whisper Model Download Delay | Large-v3 (~3GB) takes time to download on every start. | Implemented persistent Modal Volume (`/hf_cache`) to store models permanently. |

## 4. Maintenance
- **Update Models**: To update Valtec models, upload them to the `speakmate-valtec-models` volume using `modal volume put`.
- **Latency Monitoring**: Check the Modal Dashboard logs to ensure `execution` time remains around 3 seconds.
