import { pool } from '../config/db.js';

export const updateBrandDetails = async (req, res) => {
  const sellerId = req.seller.id;
  
  const {
    brand_name, nature_of_business, document_proof_type,
    average_mrp, average_selling_price, brand_catalog_width,
    average_monthly_turnover, percentage_of_online_business,
    years_of_operation, brand_usp, myntra_for_earth,
    primary_category, secondary_category, article_type,
    master_category, gender, measurement_type, sell_on_other_platforms
  } = req.body;

  // Extract file paths from Multer
  const brand_logo_url = req.files?.brand_logo ? req.files.brand_logo[0].path : null;
  const catalog_details_url = req.files?.catalog_details ? req.files.catalog_details[0].path : null;
  const document_proof_url = req.files?.document_proof ? req.files.document_proof[0].path : null;

  try {
    const queryText = `
      INSERT INTO seller_brands (
        seller_id, brand_name, brand_logo_url, catalog_details_url,
        nature_of_business, document_proof_type, document_proof_url,
        average_mrp, average_selling_price, brand_catalog_width,
        average_monthly_turnover, percentage_of_online_business,
        years_of_operation, brand_usp, myntra_for_earth,
        primary_category, secondary_category, article_type,
        master_category, gender, measurement_type, sell_on_other_platforms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *;
    `;

    const values = [
      sellerId, brand_name, brand_logo_url, catalog_details_url,
      nature_of_business, document_proof_type, document_proof_url,
      average_mrp, average_selling_price, brand_catalog_width,
      average_monthly_turnover, percentage_of_online_business,
      years_of_operation, brand_usp, myntra_for_earth,
      primary_category, secondary_category, article_type,
      master_category, gender, measurement_type, 
      sell_on_other_platforms === 'YES'
    ];

    const result = await pool.query(queryText, values);

    // Progress to Step 8: APOB Details
    await pool.query('UPDATE sellers SET current_step = 8 WHERE id = $1', [sellerId]);

    res.status(201).json({
      success: true,
      brand: result.rows[0],
      nextStep: 8
    });
  } catch (error) {
    console.error("Brand Detail Error:", error);
    res.status(500).json({ message: "Failed to save brand details" });
  }
};