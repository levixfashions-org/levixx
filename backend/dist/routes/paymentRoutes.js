import { Router } from 'express';
import { checkoutRateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { verifyPayment, handleWebhook } from '../controllers/paymentController.js';
const router = Router();
router.post('/verify', checkoutRateLimiter, h(verifyPayment));
router.post('/webhook', h(handleWebhook));
export default router;
