import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export function notFoundApi(req, res) {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
}
export function errorHandler(err, req, res, _next) {
    if (err instanceof ZodError) {
        const first = err.issues[0];
        res.status(400).json({
            error: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Validation error',
            details: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
        });
        return;
    }
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    if (err?.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
    }
    if (err?.type === 'entity.too.large') {
        res.status(413).json({ error: 'Request body too large' });
        return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = err.meta?.target;
            res.status(409).json({ error: `A record with this ${Array.isArray(target) ? target.join(', ') : target || 'value'} already exists` });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'The requested record was not found' });
            return;
        }
        if (err.code === 'P2003') {
            res.status(400).json({ error: 'This record is linked to other data and cannot be changed that way' });
            return;
        }
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
        console.error('Database unavailable:', err.message);
        res.status(503).json({ error: 'Store database is temporarily unavailable. Please try again shortly.' });
        return;
    }
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({
        error: 'Something went wrong on our side. Please try again.',
        ...(process.env.NODE_ENV === 'development' ? { message: err?.message } : {})
    });
}
/** Wraps async route handlers so thrown errors reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};
