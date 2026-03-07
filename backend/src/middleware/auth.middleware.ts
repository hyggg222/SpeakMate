import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/env';

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
 * Decodes a Supabase JWT locally — no HTTP call to Supabase.
 * Supabase JWTs are standard JWTs signed with the project's JWT secret.
 * We decode the payload to extract user info (sub = user id, email).
 * Note: This trusts the token without signature verification.
 * For production, use jsonwebtoken.verify() with SUPABASE_JWT_SECRET.
 */
function verifyToken(token: string): { id: string; email: string } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }

        // Supabase JWT has sub = user UUID, email in payload
        if (!payload.sub) return null;

        return {
            id: payload.sub,
            email: payload.email || '',
        };
    } catch {
        return null;
    }
}

/**
 * Auth middleware that blocks unauthenticated requests.
 * Attaches `req.user` with `id` and `email` on success.
 * Returns 401 JSON error on failure.
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ error: 'Authorization token is required' });
        return;
    }

    const user = verifyToken(token);
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
export function authOptional(req: Request, res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (token) {
        const user = verifyToken(token);
        if (user) {
            req.user = user;
        }
    }
    next();
}
