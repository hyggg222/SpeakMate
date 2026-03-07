import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
    port: process.env.PORT || 3001,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    nodeEnv: process.env.NODE_ENV || 'development',
    ttsServiceUrl: process.env.TTS_SERVICE_URL || 'http://localhost:8000',
    sttServiceUrl: process.env.STT_SERVICE_URL || 'http://localhost:8001',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'vistral-7b-chat',
    // Unified Cloud Pipeline (Modal)
    modalInteractUrl: process.env.MODAL_INTERACT_URL || "https://optimindss4--speakmate-pipeline-v2-voicepipeline-interact.modal.run",
    modalTranscribeUrl: process.env.MODAL_TRANSCRIBE_URL || "https://optimindss4--speakmate-pipeline-v2-voicepipeline-transcribe.modal.run",
    // Internal API (Modal worker → backend)
    internalApiKey: process.env.INTERNAL_API_KEY || '',
    // LiveKit credentials
    livekitUrl: process.env.LIVEKIT_URL || 'wss://speakmate-yu7nfde8.livekit.cloud',
    livekitApiKey: process.env.LIVEKIT_API_KEY || 'APItNUc8VAU8Frg',
    livekitApiSecret: process.env.LIVEKIT_API_SECRET || 'V7RaxJa5U57VVz2xj8WhfMdeZ5DQSZfgIDbpqRiUgqcA',
};

// Simple validation
if (!config.geminiApiKey) {
    console.warn('WARN: GEMINI_API_KEY is not set');
}
