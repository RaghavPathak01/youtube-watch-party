import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyUsersTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);

    if (result.rows.length === 0) {
      console.log("❌ The 'users' table does NOT exist in the database.");
    } else {
      console.log("✅ The 'users' table EXISTS! Here are its columns:");
      result.rows.forEach(row => {
        console.log(` ├── ${row.column_name} (${row.data_type})`);
      });
    }
  } catch (error) {
    console.error("❌ Error verifying table:", error);
  } finally {
    await pool.end();
  }
}

verifyUsersTable();
