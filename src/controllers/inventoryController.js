import { pool } from '../config/db.js';

export const updateStock = async (req, res) => {
  const { productId, amount, reason } = req.body; 

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // FIX: Changed 'stock' to 'inventory_quantity' and 'id' to 'product_id'
    const updateProductQuery = `
      UPDATE products 
      SET inventory_quantity = inventory_quantity + $1 
      WHERE product_id = $2 
      RETURNING inventory_quantity;
    `;
    const productResult = await client.query(updateProductQuery, [amount, productId]);

    if (productResult.rows.length === 0) {
      throw new Error("Product not found");
    }

    const newStock = productResult.rows[0].inventory_quantity;

    // 2. Log the change for Business Analysis
    const logQuery = `
      INSERT INTO stock_logs (product_id, change_amount, new_stock_level, reason)
      VALUES ($1, $2, $3, $4);
    `;
    await client.query(logQuery, [productId, amount, newStock, reason]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      newStock,
      message: `Stock updated due to ${reason}`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Stock Update Error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  } finally {
    client.release();
  }
};