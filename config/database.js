const mysql = require("mysql2/promise")
require("dotenv").config()

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "comment_system",
  charset: "utf8mb4",
  timezone: "+00:00",
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("✅ Database connected successfully")
    connection.release()
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    return false
  }
}

module.exports = { pool, testConnection }
