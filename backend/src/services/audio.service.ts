import ffmpeg from 'fluent-ffmpeg';
import { PassThrough, Readable } from 'stream';

export class AudioService {

    /**
     * Transcode `audio/mp4` (Safari) to PCM 16-bit (WAV) which is optimal for Gemini Pro Audio
     * Using streams to keep it in-memory for low-latency splitting
     */
    public async transcodeToPcm(inputBuffer: Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const inputStream = new Readable();
            inputStream.push(inputBuffer);
            inputStream.push(null);

            const outputStream = new PassThrough();
            const chunks: Buffer[] = [];

            outputStream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            outputStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            outputStream.on('error', (err) => {
                reject(err);
            });

            ffmpeg(inputStream)
                .inputFormat('mp4') // Input format fallback
                .outputFormat('wav')
                .audioCodec('pcm_s16le') // PCM 16-bit for Gemini
                .audioChannels(1)        // Mono
                .audioFrequency(16000)   // 16kHz
                .on('error', (err) => {
                    console.error('FFmpeg transcoding error:', err);
                    reject(err);
                })
                .pipe(outputStream);
        });
    }

    /**
     * The Split Stream concept: 
     * 1. Extracts fast stream logic (Skipped here as it goes directly to STT or Flash Agent)
     * 2. Takes raw stream, transcodes it ONLY if required (MIME Type branching done in Controller)
     */
    public isTranscodingRequired(mimeType: string): boolean {
        return mimeType.includes('audio/mp4'); // Safari iOS
    }
}
