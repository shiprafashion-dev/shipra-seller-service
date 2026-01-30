import { pool } from '../config/db.js';

// @desc    Get full Category -> Sub -> Type tree
// @route   GET /api/categories/tree
export const getCategoryTree = async (req, res) => {
    try {
        const queryText = `
            SELECT 
                c.category_id, c.name as category_name,
                s.subcategory_id, s.name as subcategory_name,
                pt.product_type_id, pt.name as product_type_name
            FROM categories c
            LEFT JOIN subcategories s ON c.category_id = s.category_id
            LEFT JOIN product_types pt ON s.subcategory_id = pt.subcategory_id
            ORDER BY c.name, s.name;
        `;
        
        const { rows } = await pool.query(queryText);
        
        // BA Note: In a real app, you would format this into a nested JSON object here.
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ message: "Error fetching hierarchy" });
    }
};

// @desc    Get Product Types for a specific Subcategory (Used in "Add Product" form)
// @route   GET /api/subcategories/:subId/types
export const getTypesBySubcategory = async (req, res) => {
    const { subId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM product_types WHERE subcategory_id = $1', 
            [subId]
        );
        res.status(200).json({ success: true, types: result.rows });
    } catch (error) {
        res.status(500).json({ message: "Error fetching types" });
    }
};