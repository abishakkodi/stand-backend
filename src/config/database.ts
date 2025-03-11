import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} = process.env;

// Validate required environment variables
if (!POSTGRES_HOST || !POSTGRES_PORT || !POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) {
  throw new Error('Missing required PostgreSQL environment variables');
}

export const pool = new pg.Pool({
  host: POSTGRES_HOST,
  port: parseInt(POSTGRES_PORT, 10),
  database: POSTGRES_DB,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
}); 