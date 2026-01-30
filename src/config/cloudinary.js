import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// 1. Handshake with Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Define Storage Logic
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shipra_products', // The folder name in your Cloudinary Media Library
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    // transformation: [{ width: 1000, height: 1000, crop: 'limit' }], // Ensures uniform catalog size
  },
});

// 3. Export Multer instance
export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per image
});