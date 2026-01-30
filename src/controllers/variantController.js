import { pool } from '../config/db.js';

// @desc    Add multiple professional variants to a product
// @route   POST /api/products/:productId/variants
export const addProductVariants = async (req, res) => {
    const { productId } = req.params;
    const { variants } = req.body; 
    const sellerId = req.seller.id;

    try {
        // 1. Verify Ownership (BA Security Rule)
        const ownershipCheck = await pool.query(
            'SELECT seller_id FROM products WHERE product_id = $1', 
            [productId]
        );

        if (ownershipCheck.rows[0]?.seller_id !== sellerId) {
            return res.status(403).json({ message: "Unauthorized: You do not own this product." });
        }

        // 2. Start Transaction
        await pool.query('BEGIN');

        const insertQuery = `
            INSERT INTO public.product_variants (
                product_id, sku, price, 
                option1_name, option1_value, -- Color
                option2_name, option2_value, -- Size
                inventory_quantity, 
                brand_size, standard_size, 
                gtin, hsn, prominent_colour, 
                color_variant_group_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *;
        `;

        const savedVariants = [];
        for (const v of variants) {
            const result = await pool.query(insertQuery, [
                productId,
                v.sku,
                v.price || 0.00,
                v.option1_name || 'Color',
                v.color, // Maps to option1_value
                v.option2_name || 'Size',
                v.size, // Maps to option2_value
                v.stock || 0,
                v.brand_size,
                v.standard_size,
                v.gtin,
                v.hsn,
                v.prominent_colour || v.color,
                v.color_variant_group_id || `GRP-${productId}-${v.color}`
            ]);
            savedVariants.push(result.rows[0]);
        }

        await pool.query('COMMIT');
        res.status(201).json({ success: true, variants: savedVariants });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Variant Error:", error);
        if (error.code === '23505') {
            return res.status(400).json({ message: "Duplicate entry: One of the SKUs or GTINs already exists." });
        }
        res.status(500).json({ message: "Internal Server Error during variant creation." });
    }
};