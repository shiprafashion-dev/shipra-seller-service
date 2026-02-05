import express from 'express';
import { loginWithOTP, updateGSTDetails, updateBasicInformation,loginWithEmail } from '../controllers/authController.js';
import { checkOnboardingStatus } from '../controllers/onboardingController.js';
import {updateBankDetails} from "../controllers/bankController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';
import multer from 'multer';
const router = express.Router();
const upload = multer({ dest: 'temp/uploads/' }); // Or your Cloudinary config
// Public Route
router.post('/login', loginWithOTP);
router.post('/login-email', loginWithEmail);

// Protected Onboarding Routes
router.put('/onboard/gst', verifyToken, updateGSTDetails);
router.put(
  '/onboard/basic-info', 
  verifyToken, 
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'tan_document', maxCount: 1 }
  ]), 
  updateBasicInformation
);
router.put(
  '/onboard/bank', 
  verifyToken, 
  upload.single('cancelled_cheque'), 
  updateBankDetails
);
router.get('/onboarding-status', verifyToken, checkOnboardingStatus);
export default router;