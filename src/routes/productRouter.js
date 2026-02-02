import { upload } from '../config/cloudinary.js';
import { uploadProductImages } from '../controllers/imageController.js';
import { createProduct, getProductByHandle, deleteProduct ,bulkUploadProducts} from '../controllers/productController.js';
import { verifyToken, authorizeProductAccess } from '../middlewares/authMiddleware.js';
import { updateStock } from '../controllers/inventoryController.js';
import express from 'express';
import multer from 'multer';
const router = express.Router();

// Route for multi-image upload (max 5 images)
// router.post(
//   '/:productId/images', 
//   verifyToken, 
//   authorizeProductAccess, 
//   upload.array('images', 5), 
//   uploadProductImages
// );
router.post(
  '/:productId/images', 
  verifyToken, 
  authorizeProductAccess, 
  upload.array('images', 5), 
  uploadProductImages
);
router.get('/:handle', getProductByHandle);

// Private: Seller actions
router.post('/', verifyToken, createProduct);
router.delete('/:productId', verifyToken, authorizeProductAccess, deleteProduct);
const uploadImg = multer({ dest: 'temp/csv/' });
router.post('/bulk-upload', verifyToken, uploadImg.single('file'), bulkUploadProducts);
router.post('/update-stock', verifyToken, updateStock);
export default router;