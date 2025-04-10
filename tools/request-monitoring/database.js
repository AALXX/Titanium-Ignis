const { Pool } = require("pg");
const { getConfig } = require("./config");

let pool = null;

/**
 * Initialize the database connection
 * @param {Object} options - Database connection options
 * @returns {Promise} - Resolves when connected
 */
async function init(options = {}) {
  const config = getConfig();

  pool = new Pool({
    user: options.user || config.db.user || process.env.DB_USER || "postgres",
    host: options.host || config.db.host || process.env.DB_HOST || "localhost",
    database: options.database || config.db.database || process.env.DB_NAME || "request_metrics",
    password: options.password || config.db.password || process.env.DB_PASSWORD,
    port: options.port || config.db.port || process.env.DB_PORT || 5432,
    ssl: options.ssl || config.db.ssl || process.env.DB_SSL === "true",
  });

  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    throw new Error(`Failed to connect to database: ${err.message}`);
  }
}

/**
 * Create required database tables
 * @returns {Promise} - Resolves when tables are created
 */
async function createTables() {
  if (!pool) {
    throw new Error("Database not initialized. Call init() first.");
  }

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        ProjectToken VARCHAR(255) NOT NULL,
        ServiceName VARCHAR(100) NOT NULL,
        Method VARCHAR(10) NOT NULL,
        Path VARCHAR(255) NOT NULL,
        Status INTEGER,
        ResponseTime INTEGER,
        RequestIP VARCHAR(50),
        UserAgent TEXT,
        Headers JSONB,
        Timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_request_logs_project_token
      ON request_logs (ProjectToken);
      
      CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp 
        ON request_logs (Timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_request_logs_service_name 
        ON request_logs (ServiceName);
    `);

    return true;
  } finally {
    client.release();
  }
}

/**
 * Log a request to the database
 * @param {Object} requestData - Request data to log
 * @returns {Promise} - Resolves when logged
 */
async function logRequest(requestData) {
  if (!pool) {
    console.error("[request-monitor] Database not initialized. Call init() first.");
    return false;
  }

  const columns = Object.keys(requestData).join(", ");
  const placeholders = Object.keys(requestData)
    .map((_, i) => `$${i + 1}`)
    .join(", ");
  const values = Object.values(requestData);

  try {
    await pool.query(`INSERT INTO request_logs (${columns}) VALUES (${placeholders})`, values);
    return true;
  } catch (err) {
    console.error("[request-monitor] Failed to log request:", err);
    return false;
  }
}

module.exports = {
  init,
  createTables,
  logRequest,
  getPool: () => pool,
};
