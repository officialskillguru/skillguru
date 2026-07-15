const postgres = require('postgres');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log("--- PHASE 1: Verify Live Database ---");

    // 1. Check Trigger Function
    const funcs = await sql`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'handle_new_user'
    `;
    console.log(`Function public.handle_new_user exists: ${funcs.length > 0}`);

    // 2. Check Trigger
    const triggers = await sql`
      SELECT tgname, relname 
      FROM pg_trigger 
      JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
      WHERE tgname IN ('on_auth_user_created', 'on_auth_user_created_enterprise')
    `;
    console.log(`Trigger on auth.users exists: ${triggers.length > 0 ? triggers.map(t => t.tgname).join(', ') : 'false'}`);

    // 3. Check Foreign Key profiles.id -> auth.users.id
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'profiles' AND contype = 'f'
    `;
    console.log(`Foreign Key on profiles exists:`);
    constraints.forEach(c => console.log(`  - ${c.conname}: ${c.pg_get_constraintdef}`));

    // 4. Check RLS Policies
    const policies = await sql`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'profiles'
    `;
    console.log(`RLS Policies on profiles:`);
    policies.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));

  } catch (err) {
    console.error("Error querying live database:", err);
  } finally {
    await sql.end();
  }
}

run();
