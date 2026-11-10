import { Router } from 'express';
import { checkoutRateLimiter } from '../middleware/rateLimiter.js';
import { optionalAuth, verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { createOrder, getUserOrders, getOrderByNumber, validateCoupon, trackOrder } from '../controllers/orderController.js';

const router = Router();
router.post('/', checkoutRateLimiter, optionalAuth, h(createOrder));
router.post('/validate-coupon', checkoutRateLimiter, optionalAuth, h(validateCoupon));
router.post('/track', checkoutRateLimiter, h(trackOrder));
router.get('/my-orders', verifyFirebaseToken, h(getUserOrders));
router.get('/:orderNumber', optionalAuth, h(getOrderByNumber));
export default router;
