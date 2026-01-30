import { pool } from '../config/db.js';

export const addWarehouse = async (req, res) => {
  const sellerId = req.seller.id; // From auth middleware
  const {
    pincode, gstin_details, city, state, country,
    floor_details, full_address, operating_start_time,
    operating_end_time, warehouse_email, warehouse_contact,
    processing_capacity
  } = req.body;

  try {
    const queryText = `
      INSERT INTO warehouses (
        seller_id, pincode, gstin_details, city, state, country,
        floor_details, full_address, operating_start_time,
        operating_end_time, warehouse_email, warehouse_contact,
        processing_capacity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      sellerId, pincode, gstin_details, city, state, country,
      floor_details, full_address, operating_start_time,
      operating_end_time, warehouse_email, warehouse_contact,
      processing_capacity
    ];

    const result = await pool.query(queryText, values);

    // Update progress: Mark Warehouse Details as complete (Step 5)
    await pool.query('UPDATE sellers SET current_step = 5 WHERE id = $1', [sellerId]);

    res.status(201).json({
      success: true,
      message: "Warehouse added successfully",
      warehouse: result.rows[0]
    });
  } catch (error) {
    console.error("Warehouse Error:", error);
    res.status(500).json({ message: "Server error while adding warehouse" });
  }
};