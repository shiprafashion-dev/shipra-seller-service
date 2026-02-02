import express from 'express';
import { getSellerOrders } from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/my-orders', verifyToken, getSellerOrders);

export default router;