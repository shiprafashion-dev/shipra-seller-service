import { pool } from '../config/db.js';

export const uploadProductImages = async (req, res) => {
    const { productId } = req.params;
    const files = req.files;

    // BA Logic: Check if files actually reached the controller
    if (!files || files.length === 0) {
        console.error("❌ No files received in controller");
        return res.status(400).json({ message: "No images uploaded." });
    }

    try {
        const imageInsertPromises = files.map((file, index) => {
            console.log(`📸 Processing image ${index + 1}: ${file.path}`);
            return pool.query(
                `INSERT INTO product_images (product_id, url, alt_text, is_main, sort_order) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    productId, 
                    file.path, 
                    `Image for product ${productId}`, 
                    index === 0, 
                    index
                ]
            );
        });

        await Promise.all(imageInsertPromises);
        res.status(201).json({ success: true, message: "Gallery updated successfully." });
    } catch (error) {
    console.error("🔥 FULL ERROR OBJECT:", error); // See the whole error in terminal
    res.status(500).json({ 
        success: false, 
        message: "Cloudinary or DB Upload Failed",
        error: error.message || error 
    });
}
};