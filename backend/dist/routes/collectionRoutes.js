import { Router } from 'express';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { getCollections, getCollectionBySlug } from '../controllers/collectionController.js';
const router = Router();
router.get('/', h(getCollections));
router.get('/:slug', h(getCollectionBySlug));
export default router;
