import multer from 'multer';
import { updateBrandDetails } from '../controllers/brandController.js';
const upload = multer({ dest: 'temp/brand_docs/' });
import { verifyToken } from '../middlewares/authMiddleware.js';
import express from 'express';
const router = express.Router();
router.post(
  '/onboard/brand', 
  verifyToken, 
  upload.fields([
    { name: 'brand_logo', maxCount: 1 },
    { name: 'catalog_details', maxCount: 1 },
    { name: 'document_proof', maxCount: 1 }
  ]), 
  updateBrandDetails
);
export default router;