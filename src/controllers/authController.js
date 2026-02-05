import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Ensure you install this: npm install bcryptjs

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
  
  const {
    organization_email,
    password, // 1. Added from body
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

  const signature_url = req.files?.signature ? req.files.signature[0].path : null;
  const tan_document_url = req.files?.tan_document ? req.files.tan_document[0].path : null;

  try {
    // 2. Hash password if it exists
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // 3. Updated Query (Now has 15 placeholders + 1 for WHERE clause = 16 total)
    const queryText = `
      UPDATE sellers 
      SET 
        organization_email = $1, 
        password = COALESCE($2, password), -- Placeholder $2
        primary_contact_name = $3, 
        primary_contact_phone = $4, 
        primary_contact_email = $5, 
        business_owner_name = $6, 
        owner_contact_number = $7, 
        owner_email_id = $8, 
        is_existing_partner = $9, 
        entity_type = $10, 
        myntra_generated_invoice = $11, 
        signature_url = $12, 
        needs_tds_benefits = $13, 
        tan_number = $14, 
        tan_document_url = $15, 
        current_step = 5, 
        updated_at = NOW()
      WHERE id = $16 -- $16 matches the 16th value in the array
      RETURNING id, current_step;
    `;

    // 4. Values array (Must have exactly 16 items)
    const values = [
      organization_email,       // $1
      hashedPassword,           // $2
      primary_contact_name,     // $3
      primary_contact_phone,    // $4
      primary_contact_email,    // $5
      business_owner_name,      // $6
      owner_contact_number,     // $7
      owner_email_id,           // $8
      is_existing_partner === 'Yes', // $9
      entity_type,              // $10
      myntra_generated_invoice === 'Yes', // $11
      signature_url,            // $12
      needs_tds_benefits === 'Yes', // $13
      tan_number,               // $14
      tan_document_url,         // $15
      sellerId                  // $16
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

export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  try {
    // 1. Check if seller exists by organization_email or owner_email_id
    const queryText = `
      SELECT * FROM sellers 
      WHERE organization_email = $1 OR owner_email_id = $1;
    `;
    const result = await pool.query(queryText, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const seller = result.rows[0];

    // 2. Compare Password (assuming you store hashed passwords)
    // If you haven't implemented password setting yet, you can skip this 
    // or use a temporary check.
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: seller.id, email: seller.organization_email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Send Response
    res.status(200).json({ 
      success: true, 
      token, 
      seller: {
        id: seller.id,
        email: seller.organization_email,
        current_step: seller.current_step,
        is_onboarded: seller.is_onboarded
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};