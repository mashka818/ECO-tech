import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'eco_tech',
  user: process.env.DATABASE_USER || 'eco-tech',
  password: process.env.DATABASE_PASSWORD || 'eco-tech-password-db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err: Error) => {
  console.error('❌ Database connection error:', err);
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const err = error as Error;
    console.error('Query error', { text, error: err.message });
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to log the query
  (client as any).query = function(...args: Parameters<typeof originalQuery>) {
    (client as any).lastQuery = args;
    return originalQuery(...args);
  };
  
  // Monkey patch the release method
  (client as any).release = function() {
    clearTimeout(timeout);
    (client as any).query = originalQuery;
    (client as any).release = originalRelease;
    return originalRelease();
  };
  
  return client;
};

export { pool };

