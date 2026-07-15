const postgres = require('postgres');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log("--- Checking for orphaned Auth Users ---");

    const orphanedUsers = await sql`
      SELECT id, email, created_at 
      FROM auth.users 
      WHERE id NOT IN (SELECT id FROM public.profiles)
    `;

    console.log(`Found ${orphanedUsers.length} orphaned users in auth.users without a profile.`);
    if (orphanedUsers.length > 0) {
      console.log(orphanedUsers);
    }

    console.log("\n--- Checking recent signups ---");
    const recentUsers = await sql`
      SELECT id, email, created_at 
      FROM auth.users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    console.log("Recent Auth Users:");
    console.log(recentUsers);

  } catch (err) {
    console.error("Error querying live database:", err);
  } finally {
    await sql.end();
  }
}

run();
