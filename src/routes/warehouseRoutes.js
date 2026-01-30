import express from 'express';
import { addWarehouse } from '../controllers/warehouseController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/warehouse/add
router.post('/add', verifyToken, addWarehouse);

export default router;