import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/verifyFirebaseToken.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { prisma } from '../config/db.js';
import { getVapidKeys } from '../services/push.js';
/** Public endpoints the shop uses to turn notifications on/off for this device. */
const router = Router();
router.get('/key', h(async (_req, res) => {
    const { publicKey } = await getVapidKeys();
    res.set('Cache-Control', 'no-cache');
    res.json({ publicKey });
}));
const subSchema = z.object({
    subscription: z.object({
        endpoint: z.string().url().max(700).refine((u) => u.startsWith('https://'), 'Invalid push endpoint'),
        keys: z.object({ p256dh: z.string().min(40).max(255), auth: z.string().min(8).max(64) })
    }),
    platform: z.enum(['android', 'ios', 'desktop']).optional()
});
router.post('/subscribe', authRateLimiter, optionalAuth, h(async (req, res) => {
    const { subscription, platform } = subSchema.parse(req.body);
    const data = {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        platform: platform || null,
        failCount: 0,
        // Link to the signed-in customer (for order updates); keep an existing link if signed out now.
        ...(req.user ? { userId: req.user.id } : {})
    };
    await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: data,
        create: { endpoint: subscription.endpoint, ...data }
    });
    res.json({ success: true });
}));
router.post('/unsubscribe', authRateLimiter, h(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url().max(700) }).parse(req.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ success: true });
}));
export default router;
