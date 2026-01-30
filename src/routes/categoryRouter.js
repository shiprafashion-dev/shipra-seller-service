import express from 'express';
import { getCategoryTree, getTypesBySubcategory } from '../controllers/hierarchyController.js';

const router = express.Router();

// Publicly accessible for the Website Navigation and Seller Forms
router.get('/tree', getCategoryTree);
router.get('/sub/:subId/types', getTypesBySubcategory);

export default router;