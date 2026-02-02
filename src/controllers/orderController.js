import { pool } from '../config/db.js';

export const getSellerOrders = async (req, res) => {
const sellerId = req.seller.id;

  try {
   const query = `
      SELECT 
        oi.order_item_id AS item_id, -- FIX: Changed oi.id to oi.order_item_id
        oi.order_id,
        p.title,
        p.sku,
        oi.quantity,
        oi.price_at_purchase,
        o.status AS order_status,
        o.created_at
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE p.seller_id = $1
      ORDER BY o.created_at DESC;
    `;

    const result = await pool.query(query, [sellerId]);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      orders: result.rows
    });
  } catch (error) {
    console.error("Seller Order Fetch Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};