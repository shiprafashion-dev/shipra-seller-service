import { pool } from '../config/db.js';

export const checkOnboardingStatus = async (req, res) => {
  const sellerId = req.seller.id;

  try {
    // Aggregated check across all relevant tables
    const query = `
      SELECT 
        s.current_step, s.gst_number, s.pan_number, s.bank_verified, s.legal_business_name,
        (SELECT COUNT(*) FROM warehouses WHERE seller_id = $1) as warehouse_count,
        (SELECT COUNT(*) FROM seller_brands WHERE seller_id = $1) as brand_count
      FROM sellers s
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [sellerId]);
    const data = result.rows[0];

    const pendingParts = [];

    // Business Logic: Check each section for completeness
    if (!data.gst_number) pendingParts.push("GSTIN Check");
    if (!data.legal_business_name) pendingParts.push("Basic Information");
    if (parseInt(data.warehouse_count) === 0) pendingParts.push("Warehouse Details");
    if (!data.bank_verified && !data.pan_number) pendingParts.push("Bank Details");
    if (parseInt(data.brand_count) === 0) pendingParts.push("Brand Details");

    // Final Response
    if (pendingParts.length === 0) {
      return res.status(200).json({
        success: true,
        isComplete: true,
        message: "Submission Completed!",
        description: "You have successfully completed the Vendor Onboarding form! We shall review your form and get back to you regarding the further steps."
      });
    } else {
      return res.status(200).json({
        success: true,
        isComplete: false,
        message: "Onboarding Incomplete",
        pendingParts: pendingParts // Frontend will map these to the sidebar
      });
    }
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};