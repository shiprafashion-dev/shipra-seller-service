import express from 'express';
import { addProductVariants } from '../controllers/variantController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// @route   POST /api/products/:productId/variants
// @desc    Add multiple variants (Size/Color/SKU) to a specific product
// @access  Private (Seller only)
router.post('/:productId/variants', verifyToken, addProductVariants);

export default router;