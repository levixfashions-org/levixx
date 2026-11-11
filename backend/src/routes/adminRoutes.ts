import express, { Router } from 'express';
import { verifyFirebaseToken, requireAdmin } from '../middleware/verifyFirebaseToken.js';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import * as admin from '../controllers/adminController.js';
import { invalidateHomeCache } from '../controllers/homeController.js';
import { invalidateSettingsCache } from '../services/store.js';
import { broadcastChange } from '../services/live.js';
import { uploadMedia, uploadVideoChunk } from '../controllers/mediaController.js';

const router = Router();
router.use(verifyFirebaseToken);
router.use(requireAdmin);
// Any change made in the admin panel clears the server caches and is pushed live to every open shop tab.
router.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      invalidateHomeCache();
      invalidateSettingsCache();
      const scope = req.path.split('/')[1] || 'all'; // products, collections, settings, orders, …
      broadcastChange(scope);
    });
  }
  next();
});

router.get('/metrics', h(admin.getDashboardMetrics));

// Image uploads (raw image body, compressed in the browser first)
router.post('/media', express.raw({ type: ['image/*', 'application/octet-stream'], limit: '8mb' }), h(uploadMedia));
router.post('/media/video', express.raw({ type: ['video/*', 'application/octet-stream'], limit: '5mb' }), h(uploadVideoChunk));

router.get('/orders', h(admin.getAllOrders));
router.patch('/orders/:id', h(admin.updateOrder));
router.patch('/orders/:id/status', h(admin.updateOrder));
router.delete('/orders/:id', h(admin.deleteOrder));

router.get('/products', h(admin.getAdminProducts));
router.post('/products', h(admin.createProduct));
router.put('/products/:id', h(admin.updateProduct));
router.delete('/products/:id', h(admin.deleteProduct));

router.post('/categories', h(admin.createCategory));
router.put('/categories/:id', h(admin.updateCategory));
router.delete('/categories/:id', h(admin.deleteCategory));

router.get('/settings', h(admin.getAdminStoreSettings));
router.post('/settings', h(admin.updateAdminStoreSettings));
router.put('/settings', h(admin.updateAdminStoreSettings));

router.get('/discounts', h(admin.getAdminDiscounts));
router.post('/discounts', h(admin.createAdminDiscount));
router.patch('/discounts/:id/toggle', h(admin.toggleAdminDiscount));
router.delete('/discounts/:id', h(admin.deleteAdminDiscount));

router.get('/subscribers', h(admin.exportSubscribers));

router.get('/collections', h(admin.getAdminCollections));
router.post('/collections', h(admin.createCollection));
router.put('/collections/:id', h(admin.updateCollection));
router.delete('/collections/:id', h(admin.deleteCollection));

export default router;
