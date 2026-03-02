import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
    port: process.env.PORT || 3001,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    nodeEnv: process.env.NODE_ENV || 'development'
};

// Simple validation
if (!config.geminiApiKey) {
    console.warn('WARN: GEMINI_API_KEY is not set');
}
