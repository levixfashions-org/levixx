import rateLimit from 'express-rate-limit';
// NOTE: app.set('trust proxy', 1) is configured in app.ts so req.ip is the real visitor IP.
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 900,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many account requests. Please try again later.' }
});
export const checkoutRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many checkout attempts. Please wait a few minutes.' }
});
