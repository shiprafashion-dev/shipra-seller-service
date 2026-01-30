import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';

// Helper for Regex Validation
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const loginWithOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || otp !== '123456') {
    return res.status(400).json({ message: "Invalid Phone or OTP" });
  }

  try {
    const queryText = `
      INSERT INTO sellers (phone_number) VALUES ($1) 
      ON CONFLICT (phone_number) DO UPDATE SET updated_at = NOW()
      RETURNING id, phone_number, current_step, is_onboarded;
    `;
    const result = await pool.query(queryText, [phoneNumber]);
    const seller = result.rows[0];

    const token = jwt.sign(
      { id: seller.id, phoneNumber: seller.phone_number },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({ success: true, token, seller });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Step 2/3: GST & PAN Validation
// @route   PUT /api/auth/onboard/gst
// ... existing imports

export const updateGSTDetails = async (req, res) => {
  const { gst_number, pan_number, has_gst } = req.body;
  const sellerId = req.seller.id;

  // 1. Basic Format Validation (RegEx)
  if (has_gst && !GSTIN_REGEX.test(gst_number)) {
    return res.status(400).json({ message: "Invalid GSTIN format" });
  }
  if (!PAN_REGEX.test(pan_number)) {
    return res.status(400).json({ message: "Invalid PAN format" });
  }

  // 2. Structural Match: PAN must be part of the GSTIN
  if (has_gst && !gst_number.includes(pan_number)) {
    return res.status(400).json({ message: "GSTIN does not match the provided PAN" });
  }

  try {
    let legalName = null;

    /* // --- THIRD PARTY VERIFICATION COMMENTED OUT FOR NOW ---
    if (has_gst) {
      const verifyRes = await axios.get(`https://api.sandbox.co.in/gsp/public/search/taxpayer/${gst_number}`, {
        headers: { 'Authorization': process.env.SANDBOX_KEY, 'x-api-key': process.env.SANDBOX_SECRET }
      });
      const gstData = verifyRes.data.data;
      if (gstData.sts !== 'Active') {
        return res.status(403).json({ message: "This GSTIN is not Active." });
      }
      legalName = gstData.lgnm; 
    }
    // -------------------------------------------------------
    */

    // 4. Update Database 
    // Note: legal_business_name will be null for now since verification is disabled
    const queryText = `
      UPDATE sellers 
      SET 
        gst_number = $1, 
        pan_number = $2, 
        has_gst = $3, 
        current_step = 4, 
        updated_at = NOW()
      WHERE id = $4 RETURNING id, current_step;
    `;
    
    const result = await pool.query(queryText, [gst_number, pan_number, has_gst, sellerId]);
    
    res.status(200).json({ 
      success: true, 
      nextStep: result.rows[0].current_step 
    });

  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: "GST or PAN already registered" });
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateBasicInformation = async (req, res) => {
  const sellerId = req.seller.id;
  
  // Extracting data from req.body (sent via form-data)
  const {
    organization_email,
    primary_contact_name,
    primary_contact_phone,
    primary_contact_email,
    business_owner_name,
    owner_contact_number,
    owner_email_id,
    is_existing_partner,
    entity_type,
    myntra_generated_invoice,
    needs_tds_benefits,
    tan_number
  } = req.body;

  // File URLs (assuming you have a middleware that uploads to Cloudinary/S3)
  const signature_url = req.files?.signature ? req.files.signature[0].path : null;
  const tan_document_url = req.files?.tan_document ? req.files.tan_document[0].path : null;

  try {
    const queryText = `
      UPDATE sellers 
      SET 
        organization_email = $1, primary_contact_name = $2, primary_contact_phone = $3, 
        primary_contact_email = $4, business_owner_name = $5, owner_contact_number = $6, 
        owner_email_id = $7, is_existing_partner = $8, entity_type = $9, 
        myntra_generated_invoice = $10, signature_url = $11, needs_tds_benefits = $12, 
        tan_number = $13, tan_document_url = $14, 
        current_step = 5, updated_at = NOW()
      WHERE id = $15 RETURNING id, current_step;
    `;

    const values = [
      organization_email, primary_contact_name, primary_contact_phone,
      primary_contact_email, business_owner_name, owner_contact_number,
      owner_email_id, is_existing_partner === 'Yes', entity_type,
      myntra_generated_invoice === 'Yes', signature_url, needs_tds_benefits === 'Yes',
      tan_number, tan_document_url, sellerId
    ];

    const result = await pool.query(queryText, values);

    res.status(200).json({ 
      success: true, 
      message: "Basic Information updated successfully",
      nextStep: result.rows[0].current_step 
    });
  } catch (error) {
    console.error("Basic Info Update Error:", error);
    res.status(500).json({ message: "Failed to update basic information" });
  }
};