/**
 * MySQL Database Configuration
 * 
 * Provides a connection pool for MySQL database operations.
 * Uses mysql2/promise for async/await support.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'sv63.ifastnet12.org',
  user: process.env.DB_USER || 'masakali_kiran',
  password: process.env.DB_PASSWORD || 'K143iran',
  database: process.env.DB_NAME || 'masakali_mediacore',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on initialization
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL database connected successfully');
    console.log(`   Database: ${process.env.DB_NAME || 'masakali_mediacore'}`);
    console.log(`   Host: ${process.env.DB_HOST || 'sv63.ifastnet12.org'}`);
    connection.release();
  })
  .catch(error => {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('   Please check your database credentials and connection');
  });

/**
 * Helper function to execute queries with error handling
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query results
 */
const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('SQL:', sql);
    throw error;
  }
};

/**
 * Helper function to get a single row
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Single row or null
 */
const queryOne = async (sql, params = []) => {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
};

/**
 * Helper function for transactions
 * @param {Function} callback - Function containing transaction logic
 * @returns {Promise} Transaction result
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  queryOne,
  transaction
};
