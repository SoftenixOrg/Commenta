const fs = require("fs")
const path = require("path")
const { pool } = require("./config/database")

async function runSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, "utf8")
    const statements = sql.split(";").filter((stmt) => stmt.trim())

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement)
      }
    }
    console.log(`✅ Executed: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(`❌ Error executing ${filePath}:`, error.message)
    throw error
  }
}

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database...")

    // Run SQL files in order
    await runSQLFile("./scripts/01-create-database.sql")
    await runSQLFile("./scripts/02-create-tables.sql")

    console.log("✅ Database setup completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    process.exit(1)
  }
}

setupDatabase()
