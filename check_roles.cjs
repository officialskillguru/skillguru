require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Check roles
    const res = await client.query('SELECT code FROM public.roles');
    console.log("Roles found:", res.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
