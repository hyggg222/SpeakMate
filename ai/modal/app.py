import modal

app = modal.App("speakmate-pipeline-v2")

volumes = {
    "/hf_cache":      modal.Volume.from_name("speakmate-hf-cache",       create_if_missing=True),
    "/valtec_models": modal.Volume.from_name("speakmate-valtec-models",  create_if_missing=True),
    "/debug_audio":   modal.Volume.from_name("speakmate-debug-audio",    create_if_missing=True),
}
