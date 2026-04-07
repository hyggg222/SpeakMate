import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Privacy First: Supabase Object Lifecycle Management takes care of strict 1-hour TTL
// Fallback cron jobs on Supabase will also scan for files older than 1 hr

const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export class StorageService {
    private bucketName = 'temp-audio-sessions';

    // Upload an audio buffer directly
    public async uploadAudio(fileName: string, buffer: Buffer, contentType: string): Promise<string | null> {
        if (!supabase) {
            console.warn("[StorageService] Supabase not configured, skipping upload.");
            return null;
        }
        try {
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(fileName, buffer, {
                    contentType,
                    cacheControl: '3600', // Browser side cache limit
                    upsert: true,
                });

            if (error) {
                console.error("Upload error:", error);
                return null;
            }
            return data.path;
        } catch (err) {
            console.error("StorageService Error:", err);
            return null;
        }
    }

    // Get signed URL that only lasts for 1 hour for The Analyst Agent
    public async getSignedUrl(filePath: string): Promise<string | null> {
        if (!supabase) {
            console.warn("[StorageService] Supabase not configured, skipping signed URL.");
            return null;
        }
        try {
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .createSignedUrl(filePath, 3600); // Expires in 1 hour

            if (error) {
                console.error("Sign URL error:", error);
                return null;
            }
            return data?.signedUrl || null;
        } catch (err) {
            console.error("GetSignedUrl Error:", err);
            return null;
        }
    }
}
