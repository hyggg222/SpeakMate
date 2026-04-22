"""
GemmaWorker — vLLM-based Gemma inference endpoint on Modal.
Exposes an HTTP endpoint for the Node.js backend to call.
"""
import os
import modal

from ai.modal.app import app
from ai.modal.image import gemma_image

HF_CACHE_VOL = modal.Volume.from_name("speakmate-hf-cache", create_if_missing=True)

# Model to serve — pick one that fits L4 16GB
MODEL_ID = "google/gemma-3-4b-it"  # ~8GB VRAM quantized, fits L4 comfortably
MAX_MODEL_LEN = 4096
GPU_MEMORY_UTILIZATION = 0.85


@app.cls(
    image=gemma_image,
    gpu="L4",
    memory=16384,
    volumes={"/hf_cache": HF_CACHE_VOL},
    secrets=[modal.Secret.from_name("huggingface-token")],
    scaledown_window=300,
    timeout=86400,
    allow_concurrent_inputs=8,
)
class GemmaWorker:
    @modal.enter()
    def load_model(self):
        """Load Gemma model via vLLM engine on container startup."""
        os.environ["HF_HUB_CACHE"] = "/hf_cache"
        os.environ["HF_HOME"] = "/hf_cache"
        os.environ["TRANSFORMERS_CACHE"] = "/hf_cache"

        from vllm import LLM, SamplingParams
        print(f"[Gemma] Loading {MODEL_ID}...", flush=True)
        self.llm = LLM(
            model=MODEL_ID,
            max_model_len=MAX_MODEL_LEN,
            gpu_memory_utilization=GPU_MEMORY_UTILIZATION,
            trust_remote_code=True,
            download_dir="/hf_cache",
            dtype="bfloat16",
        )
        self.tokenizer = self.llm.get_tokenizer()
        print(f"[Gemma] Model loaded successfully!", flush=True)

    @modal.web_endpoint(method="POST")
    def chat(self, request: dict):
        """
        Chat endpoint for Mentor Ni.
        Input: {
            "system_prompt": str,
            "messages": [{"role": "user"|"assistant", "content": str}],
            "temperature": float (default 0.7),
            "max_tokens": int (default 512)
        }
        Output: {
            "reply": str,
            "usage": {"prompt_tokens": int, "completion_tokens": int}
        }
        """
        from vllm import SamplingParams

        system_prompt = request.get("system_prompt", "")
        messages = request.get("messages", [])
        temperature = request.get("temperature", 0.7)
        max_tokens = request.get("max_tokens", 512)

        # Build chat messages for tokenizer
        chat_messages = []
        if system_prompt:
            chat_messages.append({"role": "system", "content": system_prompt})
        chat_messages.extend(messages)

        # Apply chat template
        prompt = self.tokenizer.apply_chat_template(
            chat_messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=0.9,
        )

        outputs = self.llm.generate([prompt], params)
        generated_text = outputs[0].outputs[0].text.strip()

        return {
            "reply": generated_text,
            "usage": {
                "prompt_tokens": len(outputs[0].prompt_token_ids),
                "completion_tokens": len(outputs[0].outputs[0].token_ids),
            }
        }
