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

export const updateOrderItemStatus = async (req, res) => {
  const sellerId = req.seller.id; // From verifyToken middleware
  const { orderItemId } = req.params;
  const { newStatus } = req.body;

  // Define allowed transitions for data integrity
  const allowedStatuses = ['PENDING', 'SHIPPED', 'DELIVERED'];
  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    // 1. Verify that this item belongs to the logged-in seller
    const checkOwnershipQuery = `
      SELECT oi.order_item_id 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_item_id = $1 AND p.seller_id = $2;
    `;
    const ownershipResult = await pool.query(checkOwnershipQuery, [orderItemId, sellerId]);

    if (ownershipResult.rowCount === 0) {
      return res.status(403).json({ message: "Access denied: You do not own this order item." });
    }

    // 2. Update the status
    const updateQuery = `
      UPDATE order_items 
      SET status = $1, updated_at = NOW() 
      WHERE order_item_id = $2 
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [newStatus, orderItemId]);

    res.status(200).json({
      success: true,
      message: `Status updated to ${newStatus}`,
      updatedItem: result.rows[0]
    });
  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getSellerDashboard = async (req, res) => {
  const sellerId = req.seller.id; // Extracted from the verifyToken middleware

  try {
    // Define all three queries
    const revenueQuery = `
      SELECT SUM(oi.quantity * oi.price_at_purchase) AS total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE p.seller_id = $1;
    `;

    const topSellingQuery = `
      SELECT p.title, SUM(oi.quantity) AS units_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE p.seller_id = $1
      GROUP BY p.product_id, p.title
      ORDER BY units_sold DESC LIMIT 5;
    `;

    const lowStockQuery = `
      SELECT title, inventory_quantity 
      FROM products 
      WHERE seller_id = $1 AND inventory_quantity < 10;
    `;

    // Execute all simultaneously
    const [revenueRes, topSellingRes, lowStockRes] = await Promise.all([
      pool.query(revenueQuery, [sellerId]),
      pool.query(topSellingQuery, [sellerId]),
      pool.query(lowStockQuery, [sellerId])
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: revenueRes.rows[0].total_revenue || 0,
        topProducts: topSellingRes.rows,
        lowStockAlerts: lowStockRes.rows
      }
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};