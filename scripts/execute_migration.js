import { Client } from "pg";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

async function runSQL() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");
    const sql = fs.readFileSync("supabase/migrations/004a_identity_rpc.sql", "utf-8");
    await client.query(sql);
    console.log("Executed 004a_identity_rpc.sql successfully.");
  } catch(e) {
    console.error("Failed:", e);
  } finally {
    await client.end();
  }
}

runSQL();
