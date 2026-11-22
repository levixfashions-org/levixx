import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/verifyFirebaseToken.js';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { createReturn, uploadReturnPhoto, uploadReturnVideo } from '../controllers/returnsController.js';

const returnsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});

const router = Router();
router.use(returnsLimiter);
router.post('/:orderNumber/photo', optionalAuth, express.raw({ type: ['image/*', 'application/octet-stream'], limit: '12mb' }), h(uploadReturnPhoto));
router.post('/:orderNumber/video', optionalAuth, express.raw({ type: ['video/*', 'application/octet-stream'], limit: '5mb' }), h(uploadReturnVideo));
router.post('/:orderNumber', optionalAuth, h(createReturn));
export default router;
