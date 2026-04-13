import { config } from '../config/env';

/**
 * HTTP client for the local PhoWhisper STT service (backend-stt).
 * Sends audio buffers and returns transcribed text.
 */
export class SttService {
    private serviceUrl: string;

    constructor() {
        this.serviceUrl = config.sttServiceUrl;
    }

    /**
     * Transcribes an audio buffer by sending it to the STT service.
     *
     * @param audioBuffer - Raw audio bytes (WAV, WebM, MP4, etc.)
     * @param filename - Filename hint for format detection (e.g. "audio.wav")
     * @returns The transcribed text, or empty string if nothing was detected.
     */
    async transcribe(audioBuffer: Buffer, filename = 'audio.wav'): Promise<string> {
        const modalSttUrl = config.modalTranscribeUrl;
        const audioBase64 = audioBuffer.toString('base64');

        console.log(`[SttService] Offloading STT to Modal Cloud...`);
        const response = await fetch(modalSttUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: audioBase64 }),
        });

        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Cloud STT error (${response.status}): ${detail}`);
        }

        const data: any = await response.json();
        return data.transcript || '';
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.serviceUrl}/health`);
            const data: any = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }
}
