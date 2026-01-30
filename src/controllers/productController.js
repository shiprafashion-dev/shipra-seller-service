import csv from 'csv-parser';
import fs from 'fs';
import { pool } from '../config/db.js';

export const bulkUploadProducts = async (req, res) => {
    const sellerId = req.seller.id;
    const results = [];

    if (!req.file) {
        return res.status(400).json({ message: "Please upload a CSV file." });
    }

    // 1. Parse CSV File from local temp storage
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN'); // Start Transaction

                for (const row of results) {
                    // 2. UPSERT Product
                    // Uses 'unique_handle' constraint to update title/vendor if handle exists
                    const productRes = await client.query(`
                        INSERT INTO products (handle, title, vendor, category_id, seller_id, status)
                        VALUES ($1, $2, $3, $4, $5, 'active')
                        ON CONFLICT ON CONSTRAINT unique_handle 
                        DO UPDATE SET title = EXCLUDED.title, vendor = EXCLUDED.vendor
                        RETURNING product_id
                    `, [row.handle, row.title, row.vendor, row.category_id, sellerId]);

                    const productId = productRes.rows[0].product_id;

                    // 3. UPSERT Variant
                    // Maps CSV 'stock' -> inventory_quantity, 'size' -> brand_size, 'color' -> prominent_colour
                    await client.query(`
                        INSERT INTO product_variants (
                            product_id, sku, price, inventory_quantity, 
                            brand_size, standard_size, prominent_colour, 
                            option1_value, option2_value
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT ON CONSTRAINT unique_sku 
                        DO UPDATE SET 
                            price = EXCLUDED.price, 
                            inventory_quantity = EXCLUDED.inventory_quantity,
                            brand_size = EXCLUDED.brand_size,
                            prominent_colour = EXCLUDED.prominent_colour
                    `, [
                        productId, 
                        row.sku, 
                        parseFloat(row.price) || 0, 
                        parseInt(row.stock) || 0, 
                        row.size,  // brand_size
                        row.size,  // standard_size
                        row.color, // prominent_colour
                        row.color, // option1 (Color)
                        row.size   // option2 (Size)
                    ]);

                    // 4. INSERT Image (Optional)
                    if (row.image_url) {
                        await client.query(`
                            INSERT INTO product_images (product_id, url, is_main)
                            VALUES ($1, $2, true)
                            ON CONFLICT DO NOTHING
                        `, [productId, row.image_url]);
                    }
                }

                await client.query('COMMIT');
                res.status(201).json({ 
                    success: true, 
                    message: `Successfully processed ${results.length} records.` 
                });
            } catch (error) {
                await client.query('ROLLBACK');
                console.error("🔥 Bulk Upload Error:", error);
                res.status(500).json({ success: false, error: error.message });
            } finally {
                client.release();
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        });
};
// @desc    Create a new Product (Master Entry)
// @route   POST /api/products
export const createProduct = async (req, res) => {
    const { 
        title, handle, vendor, category_id, subcategory_id, 
        product_type_id, price, sku, product_details, style_note 
    } = req.body;
    
    const sellerId = req.seller.id; // From verifyToken middleware

    try {
        const queryText = `
            INSERT INTO public.products 
            (title, handle, vendor, category_id, subcategory_id, product_type_id, price, sku, product_details, style_note, seller_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const values = [title, handle, vendor, category_id, subcategory_id, product_type_id, price, sku, product_details, style_note, sellerId];
        
        const result = await pool.query(queryText, values);
        res.status(201).json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error("🔥 DATABASE ERROR:", error.message); // This prints the REAL error in your terminal
        if (error.code === '23505') return res.status(400).json({ message: "Handle or SKU already exists" });
        if (error.code === '23503') return res.status(400).json({ message: "Invalid Category, Subcategory, or Type ID" });
        
        res.status(500).json({ error: error.message }); // This will show the error in Postman for now
    }
};

// @desc    Get Single Product with all Variants and Images (For Product Display Page)
// @route   GET /api/products/:handle
export const getProductByHandle = async (req, res) => {
    const { handle } = req.params;

    try {
        const queryText = `
            SELECT 
                p.*,
                (SELECT json_agg(pv.*) FROM public.product_variants pv WHERE pv.product_id = p.product_id) as variants,
                (SELECT json_agg(pi.*) FROM public.product_images pi WHERE pi.product_id = p.product_id ORDER BY pi.sort_order) as images
            FROM public.products p
            WHERE p.handle = $1;
        `;
        
        const result = await pool.query(queryText, [handle]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: "Error fetching product details" });
    }
};

// @desc    Delete Product (Cascade will handle images and variants)
// @route   DELETE /api/products/:productId
export const deleteProduct = async (req, res) => {
    const { productId } = req.params;
    const sellerId = req.seller.id;

    try {
        const result = await pool.query(
            'DELETE FROM public.products WHERE product_id = $1 AND seller_id = $2', 
            [productId, sellerId]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Product not found or unauthorized" });

        res.status(200).json({ success: true, message: "Product and all related data deleted." });
    } catch (error) {
        res.status(500).json({ message: "Deletion failed" });
    }
};