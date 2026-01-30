import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// FIX: Added 'export' so other files can use the pool for transactions
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Using the full URL is better for Neon
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);