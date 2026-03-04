import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic validation middleware factory.
 * Takes a Zod schema and returns Express middleware that validates `req.body`.
 * Returns 400 with structured error details on validation failure.
 */
export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
            return;
        }
        next();
    };
}
