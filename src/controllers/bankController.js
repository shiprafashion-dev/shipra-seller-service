import { pool } from '../config/db.js';

export const updateBankDetails = async (req, res) => {
  const sellerId = req.seller.id;
  const {
    account_holder_name,
    account_number,
    ifsc_code,
    bank_name,
    account_type
  } = req.body;

  // File upload for Cancelled Cheque
  const cancelled_cheque_url = req.file ? req.file.path : null;

  try {
    const queryText = `
      UPDATE sellers 
      SET 
        account_holder_name = $1, 
        account_number = $2, 
        ifsc_code = $3, 
        bank_name = $4, 
        account_type = $5, 
        cancelled_cheque_url = $6,
        current_step = 7, -- Progress to Brand Details
        updated_at = NOW()
      WHERE id = $7 RETURNING id, current_step;
    `;

    const values = [
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      account_type,
      cancelled_cheque_url,
      sellerId
    ];

    const result = await pool.query(queryText, values);

    res.status(200).json({
      success: true,
      message: "Bank details saved successfully",
      nextStep: result.rows[0].current_step
    });
  } catch (error) {
    console.error("Bank Detail Error:", error);
    res.status(500).json({ message: "Failed to save bank details" });
  }
};