'use client';

import { useState, useCallback, useRef } from 'react';
import type { TurnData } from './useLiveKitRoom';

export type { TurnData };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://speakmate-k26b.onrender.com/api';

/** Create WAV blob from Int16 PCM and upload to backend debug_audio/ folder */
function saveDebugWav(samples: Int16Array, sampleRate: number, filename: string) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const output = new Int16Array(buffer, 44);
    output.set(samples);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const fd = new FormData();
    fd.append('audio', blob, filename);
    fd.append('filename', filename);
    fetch(`${API_BASE}/practice/debug-audio`, { method: 'POST', body: fd })
        .catch(e => console.warn('[Debug] Save failed:', e));
}

export function useGeminiDirect(
    onNewTurn: (turn: TurnData) => void,
    browserTTS?: { speak: (text: string, gender?: 'male' | 'female') => void; cancel: () => void; isSpeaking: boolean }
) {
    const [isConnected, setIsConnected] = useState(false);
    const [isAgentReady, setIsAgentReady] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(false);

    const sessionRef = useRef<any>(null);
    const captureCtxRef = useRef<AudioContext | null>(null);
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const onNewTurnRef = useRef(onNewTurn);
    onNewTurnRef.current = onNewTurn;
    const browserTTSRef = useRef(browserTTS);
    browserTTSRef.current = browserTTS;

    const userTextBuffer = useRef('');
    const aiTextBuffer = useRef('');
    const turnCounter = useRef(0);
    const charactersRef = useRef<{ id: string; name: string }[]>([]);

    // Debug: accumulate mic PCM chunks only during user speech for VAD inspection
    const micPcmChunks = useRef<Int16Array[]>([]);
    const micPcmSamples = useRef(0); // track total samples in buffer
    const isCapturingUserSpeech = useRef(false);
    const debugTurnIndex = useRef(0);

    // Audio playback queue
    const audioQueue = useRef<ArrayBuffer[]>([]);
    const isPlaying = useRef(false);

    const playNext = useCallback(() => {
        const ctx = playbackCtxRef.current;
        if (!ctx || audioQueue.current.length === 0) {
            isPlaying.current = false;
            setIsAgentSpeaking(false);
            return;
        }
        isPlaying.current = true;
        const chunk = audioQueue.current.shift()!;
        const int16 = new Int16Array(chunk);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
        }
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = playNext;
        source.start();
    }, []);

    const enqueueAudio = useCallback((pcmBytes: Uint8Array) => {
        audioQueue.current.push(pcmBytes.buffer as ArrayBuffer);
        setIsAgentSpeaking(true);
        if (!isPlaying.current) playNext();
    }, [playNext]);

    const connect = useCallback(async (token: string, model: string, characters?: { id: string; name: string; gender?: string }[]) => {
        if (characters) charactersRef.current = characters;

        // Close any existing session first
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch { }
            sessionRef.current = null;
        }

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
                apiKey: token,
                httpOptions: { apiVersion: 'v1alpha' }
            });

            // Setup playback context
            if (playbackCtxRef.current) {
                try { playbackCtxRef.current.close(); } catch { }
            }
            playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });

            // Connect to Gemini Live
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: ['AUDIO' as any],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiDirect] Connected');
                        setIsConnected(true);
                        setIsAgentReady(true);
                    },
                    onmessage: (msg: any) => {
                        const sc = msg.serverContent;
                        if (!sc) return;

                        // Model output (audio or text depending on mode)
                        if (sc.modelTurn?.parts) {
                            for (const part of sc.modelTurn.parts) {
                                if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
                                    // AUDIO mode: decode and play
                                    const rawData = part.inlineData.data;
                                    let bytes: Uint8Array;
                                    if (typeof rawData === 'string') {
                                        const binary = atob(rawData);
                                        bytes = new Uint8Array(binary.length);
                                        for (let i = 0; i < binary.length; i++) {
                                            bytes[i] = binary.charCodeAt(i);
                                        }
                                    } else {
                                        bytes = new Uint8Array(rawData);
                                    }
                                    enqueueAudio(bytes);
                                }
                            }
                        }

                        // Input transcription (user speech) — start capturing audio
                        if (sc.inputTranscription?.text) {
                            if (!isCapturingUserSpeech.current) {
                                isCapturingUserSpeech.current = true;
                                micPcmChunks.current = [];
                                micPcmSamples.current = 0;
                                console.log('[GeminiDirect] User speech detected, capturing...');
                            }
                            userTextBuffer.current += sc.inputTranscription.text;
                            setIsUserSpeaking(true);
                        }

                        // Stop capturing when AI starts responding
                        if (sc.modelTurn?.parts && isCapturingUserSpeech.current) {
                            isCapturingUserSpeech.current = false;
                            console.log(`[GeminiDirect] Capture stopped (${(micPcmSamples.current / 16000).toFixed(1)}s)`);
                        }

                        // Output transcription (AI speech) — AUDIO mode only
                        if (sc.outputTranscription?.text) {
                            aiTextBuffer.current += sc.outputTranscription.text;
                        }

                        // Turn complete
                        if (sc.turnComplete) {
                            const userText = userTextBuffer.current.trim();
                            const aiText = aiTextBuffer.current.trim();
                            userTextBuffer.current = '';
                            aiTextBuffer.current = '';

                            // Debug: save captured user speech as WAV
                            if (userText && micPcmChunks.current.length > 0) {
                                const totalLen = micPcmSamples.current;
                                const merged = new Int16Array(totalLen);
                                let off = 0;
                                for (const chunk of micPcmChunks.current) {
                                    merged.set(chunk, off);
                                    off += chunk.length;
                                }
                                const idx = String(debugTurnIndex.current++).padStart(3, '0');
                                saveDebugWav(merged, 16000, `turn_${idx}_user.wav`);
                                console.log(`[GeminiDirect] Saved turn_${idx}_user.wav (${(totalLen / 16000).toFixed(1)}s)`);
                            }
                            micPcmChunks.current = [];
                            micPcmSamples.current = 0;
                            isCapturingUserSpeech.current = false;

                            if (userText) {
                                onNewTurnRef.current({
                                    speaker: 'User',
                                    line: userText,
                                    turn_index: turnCounter.current++,
                                    confirmed: true
                                });
                            }
                            if (aiText) {
                                const character_id = charactersRef.current[0]?.id;
                                const character_name = charactersRef.current[0]?.name;

                                onNewTurnRef.current({
                                    speaker: 'AI',
                                    character_id,
                                    character_name,
                                    line: aiText,
                                    turn_index: turnCounter.current++,
                                    confirmed: true
                                });
                            }
                            setIsUserSpeaking(false);
                        }

                        // Interruption
                        if (sc.interrupted) {
                            audioQueue.current = [];
                            browserTTSRef.current?.cancel();
                            setIsAgentSpeaking(false);
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiDirect] Error:', e);
                    },
                    onclose: () => {
                        console.log('[GeminiDirect] Disconnected');
                        setIsConnected(false);
                        setIsAgentReady(false);
                    },
                }
            });

            sessionRef.current = session;

            // Setup mic capture
            const captureCtx = new AudioContext({ sampleRate: 16000 });
            captureCtxRef.current = captureCtx;
            await captureCtx.audioWorklet.addModule('/pcm-capture-processor.js');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: { ideal: 16000 },
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            const source = captureCtx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(captureCtx, 'pcm-capture-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                if (!sessionRef.current) return;
                const pcmData = new Uint8Array(event.data);

                // Accumulate for debug — only when user speech detected
                if (isCapturingUserSpeech.current) {
                    micPcmChunks.current.push(new Int16Array(event.data));
                    micPcmSamples.current += event.data.byteLength / 2;
                }

                // Send to Gemini
                let binary = '';
                for (let i = 0; i < pcmData.length; i++) {
                    binary += String.fromCharCode(pcmData[i]);
                }
                sessionRef.current.sendRealtimeInput({
                    audio: {
                        data: btoa(binary),
                        mimeType: 'audio/pcm;rate=16000'
                    }
                });
            };

            source.connect(workletNode);
            // Don't connect to destination — no monitoring needed
            setIsMicEnabled(true);

            console.log('[GeminiDirect] Mic capture active');
        } catch (err) {
            console.error('[GeminiDirect] Connect failed:', err);
            throw err;
        }
    }, [enqueueAudio]);

    const disconnect = useCallback(() => {
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch { }
            sessionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (captureCtxRef.current) {
            captureCtxRef.current.close().catch(() => { });
            captureCtxRef.current = null;
        }
        if (playbackCtxRef.current) {
            playbackCtxRef.current.close().catch(() => { });
            playbackCtxRef.current = null;
        }
        audioQueue.current = [];
        setIsConnected(false);
        setIsAgentReady(false);
        setIsMicEnabled(false);
        setIsAgentSpeaking(false);
        setIsUserSpeaking(false);
    }, []);

    const toggleMic = useCallback(async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsMicEnabled(track.enabled);
        }
    }, []);

    /** Send text message through the live session (Gemini responds with audio) */
    const sendText = useCallback((text: string) => {
        if (!sessionRef.current || !text.trim()) return;
        try {
            sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }] });
            console.log(`[GeminiDirect] Sent text: ${text.slice(0, 50)}...`);
        } catch (err) {
            console.error('[GeminiDirect] sendText failed:', err);
        }
    }, []);

    return {
        isConnected,
        isAgentReady,
        isAgentSpeaking,
        isUserSpeaking,
        isMicEnabled,
        connect,
        disconnect,
        toggleMic,
        sendText,
    };
}
