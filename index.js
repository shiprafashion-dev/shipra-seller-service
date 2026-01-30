import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import morgan from 'morgan'; 
import { pool } from './src/config/db.js';

// Route Imports
import authRoutes from './src/routes/authRoutes.js';
import productRoutes from './src/routes/productRouter.js';
import variantRoutes from './src/routes/variantRouter.js';
import categoryRoutes from './src/routes/categoryRouter.js';
import warehouseRoutes from './src/routes/warehouseRoutes.js';
import brandRoutes from './src/routes/brandRoutes.js';

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Monitor your Postman hits in the terminal

// Global Error Handler for Debugging
// Global Error Handler - UPDATE THIS
// Global Error Handler
app.use((err, req, res, next) => {
    // This is the key: Log the WHOLE error to the terminal
    console.error("❌ GLOBAL ERROR CATCH:");
    console.error(err); 

    res.status(err.status || 500).json({
        success: false,
        message: "Internal Server Error",
        // If err.message is undefined, it will show the err object itself
        error: err.message || err.toString() 
    });
});
// --- API Routes ---

// 1. Seller Identity & Onboarding (OTP, GST/PAN)
app.use('/api/auth', authRoutes);

// 2. Catalog Hierarchy (L1, L2, L3 Navigation)
app.use('/api/categories', categoryRoutes);

// 3. Product Management (Master Entry & Images)
// This handles: POST /api/products and POST /api/products/:id/images
app.use('/api/products', productRoutes);

// 4. Variant Management (L4: Sizes, Colors, Stock)
// This handles: POST /api/products/:id/variants
app.use('/api/products', variantRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/brand', brandRoutes);

// --- Database Connection Test ---
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database Connection Error:', err.stack);
    } else {
        console.log('✅ PostgreSQL Connected Successfully');
    }
});

// --- Professional Error Handling ---

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found. Check your URL." });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

// --- Port Configuration (Strictly 5001) ---
const PORT = 5001; 
app.listen(PORT, () => {
    console.log(`🚀 Seller Onboarding Service running on port ${PORT}`);
    console.log(`📡 Base URL: http://localhost:${PORT}/api`);
});