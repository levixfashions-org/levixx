import { Router } from 'express';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { getProducts, getProductBySlug, getFilterOptions } from '../controllers/productController.js';

const router = Router();
router.get('/', h(getProducts));
router.get('/filters/options', h(getFilterOptions));
router.get('/:slug', h(getProductBySlug));
export default router;
