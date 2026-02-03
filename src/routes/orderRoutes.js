import express from 'express';
import { getSellerOrders,updateOrderItemStatus, getSellerDashboard } from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/my-orders', verifyToken, getSellerOrders);
router.get('/seller/dashboard', verifyToken, getSellerDashboard);

router.patch('/item/:orderItemId/status', verifyToken, updateOrderItemStatus);
export default router;