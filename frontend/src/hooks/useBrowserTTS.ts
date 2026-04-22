'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Browser SpeechSynthesis hook for secondary character voice.
 * Selects a female Vietnamese/English voice from system voices.
 */
export function useBrowserTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Load and select best voices
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const pickVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length === 0) return;

            // Female priorities
            const fPriorities = [
                (v: SpeechSynthesisVoice) => v.lang.startsWith('vi') && v.name.toLowerCase().includes('female'),
                (v: SpeechSynthesisVoice) => v.lang.startsWith('vi'),
                (v: SpeechSynthesisVoice) => v.name.includes('Jenny') || v.name.includes('Zira'),
                (v: SpeechSynthesisVoice) => v.name.includes('Samantha') || v.name.includes('Karen'),
                (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'),
            ];

            // Male priorities
            const mPriorities = [
                (v: SpeechSynthesisVoice) => v.lang.startsWith('vi') && v.name.toLowerCase().includes('male'),
                (v: SpeechSynthesisVoice) => v.name.includes('Guy') || v.name.includes('David'),
                (v: SpeechSynthesisVoice) => v.name.includes('Daniel') || v.name.includes('Alex'),
                (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'),
            ];

            for (const test of fPriorities) {
                const match = voices.find(test);
                if (match) { femaleVoiceRef.current = match; break; }
            }
            if (!femaleVoiceRef.current) femaleVoiceRef.current = voices[0];

            for (const test of mPriorities) {
                const match = voices.find(test);
                if (match) { maleVoiceRef.current = match; break; }
            }
            if (!maleVoiceRef.current) maleVoiceRef.current = voices[0];
        };

        pickVoices();
        speechSynthesis.addEventListener('voiceschanged', pickVoices);
        return () => speechSynthesis.removeEventListener('voiceschanged', pickVoices);
    }, []);

    const speak = useCallback((text: string, gender?: 'male' | 'female') => {
        if (!window.speechSynthesis) return;

        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Pick voice by gender
        const voice = gender === 'male' ? maleVoiceRef.current : femaleVoiceRef.current;
        if (voice) utterance.voice = voice;

        utterance.rate = 1.0;
        utterance.pitch = gender === 'male' ? 0.9 : 1.1;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        utteranceRef.current = utterance;
        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
    }, []);

    const cancel = useCallback(() => {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return { speak, cancel, isSpeaking };
}
