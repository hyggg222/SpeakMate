'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Silero VAD hook — runs in browser via @ricky0123/vad-web.
 * Provides instant isSpeaking state for UI (waveform, indicators).
 */
export function useSileroVAD() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const vadRef = useRef<any>(null);
    const activeRef = useRef(false);

    const start = useCallback(async () => {
        if (activeRef.current) return;
        activeRef.current = true;

        try {
            const { MicVAD } = await import('@ricky0123/vad-web');

            const vad = await MicVAD.new({
                baseAssetPath: '/',
                onnxWASMBasePath: '/',
                model: 'v5',
                positiveSpeechThreshold: 0.7,
                negativeSpeechThreshold: 0.3,
                startOnLoad: true,
                onSpeechStart: () => setIsSpeaking(true),
                onSpeechEnd: () => setIsSpeaking(false),
            });

            vadRef.current = vad;
            console.log('[SileroVAD] Started');
        } catch (err) {
            console.error('[SileroVAD] Failed to start:', err);
            activeRef.current = false;
        }
    }, []);

    const stop = useCallback(() => {
        if (vadRef.current) {
            try { vadRef.current.pause(); vadRef.current.destroy(); } catch {}
            vadRef.current = null;
        }
        activeRef.current = false;
        setIsSpeaking(false);
    }, []);

    return { isSpeaking, start, stop };
}
