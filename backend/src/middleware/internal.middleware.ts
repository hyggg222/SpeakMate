import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Verify INTERNAL_API_KEY for Modal worker → backend internal API calls.
 * Blocks all requests without a valid key.
 */
export function verifyInternalKey(req: Request, res: Response, next: NextFunction): void {
    const key = req.headers['authorization']?.replace('Bearer ', '');
    if (!config.internalApiKey || key !== config.internalApiKey) {
        res.status(401).json({ error: 'Unauthorized: invalid internal key' });
        return;
    }
    next();
}
