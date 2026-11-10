import { Router } from 'express';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { getCategories } from '../controllers/productController.js';
import { getHome } from '../controllers/homeController.js';
import { getSettings } from '../services/store.js';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
const router = Router();
router.get('/settings', h(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ settings: await getSettings() });
}));
router.get('/categories', h(getCategories));
router.get('/home', h(getHome));
router.post('/subscribe', authRateLimiter, h(async (req, res) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(190) }).parse(req.body);
    await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email } });
    res.json({ success: true });
}));
export default router;
