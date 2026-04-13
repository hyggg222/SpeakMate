import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/env';

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

/**
 * Verifies the JWT token using Supabase and returns the user payload.
 * Times out after 3s to avoid blocking requests when Supabase is unreachable.
 */
async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
    try {
        const result = await Promise.race([
            supabase.auth.getUser(token),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000))
        ]);
        const { data, error } = result;
        if (error || !data.user) {
            return null;
        }
        return {
            id: data.user.id,
            email: data.user.email || '',
        };
    } catch (err) {
        console.warn('[Auth] Token verification failed (timeout or network):', (err as Error).message);
        return null;
    }
}

/**
 * Auth middleware that blocks unauthenticated requests.
 * Attaches `req.user` with `id` and `email` on success.
 * Returns 401 JSON error on failure.
 */
export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ error: 'Authorization token is required' });
        return;
    }

    const user = await verifyToken(token);
    if (!user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    req.user = user;
    next();
}

/**
 * Auth middleware that attaches user info if a valid token is present,
 * but does not block unauthenticated requests (guest mode).
 */
export async function authOptional(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = extractToken(req);
    if (token) {
        const user = await verifyToken(token);
        if (user) {
            req.user = user;
        }
    }
    next();
}
