import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// 1. General Token Verification
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.seller = verified; 
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid or Expired Token" });
    }
};

// 2. Ownership Middleware (The "isSeller" CRUD Guard)
export const authorizeProductAccess = async (req, res, next) => {
    try {
        const { productId } = req.params;

        // 1. Defend against undefined 'seller' object
        if (!req.seller || !req.seller.id) {
            console.log("❌ Authorization failed: req.seller is undefined");
            return res.status(401).json({ message: "Seller session not found. Please log in again." });
        }

        const sellerId = req.seller.id;

        const result = await pool.query(
            'SELECT seller_id FROM products WHERE product_id = $1',
            [productId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (result.rows[0].seller_id !== sellerId) {
            return res.status(403).json({ message: "Access Denied: You do not own this product." });
        }

        next();
    } catch (error) {
        // BA Tip: Log the full error to catch the 'undefined' issue
        console.error("🔥 AUTHORIZATION CRASH:", error);
        next(error); // Pass it to the global error handler
    }
};