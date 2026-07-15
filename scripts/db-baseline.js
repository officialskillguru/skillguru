import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const report = {};

  try {
    // 1. Trigger definition
    const trig = await client.query(`
      SELECT pg_get_triggerdef(oid) as def
      FROM pg_trigger
      WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';
    `);
    report.trigger_definition = trig.rows[0]?.def || "NOT FOUND";

    // 2. Function definition
    const func = await client.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      WHERE proname = 'handle_new_user';
    `);
    report.function_definition = func.rows[0]?.def || "NOT FOUND";

    // 3. Orphan Users
    const orphans = await client.query(`
      SELECT u.id, u.email
      FROM auth.users u
      WHERE NOT EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = u.id
      );
    `);
    report.orphans = orphans.rows;

    // 4. Counts
    const profCount = await client.query(`SELECT COUNT(*) as c FROM public.profiles;`);
    const authCount = await client.query(`SELECT COUNT(*) as c FROM auth.users;`);
    report.profiles_count = profCount.rows[0].c;
    report.users_count = authCount.rows[0].c;

    // 5. RLS
    const rls = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname = 'profiles';
    `);
    report.profiles_rls = rls.rows[0];

    // 6. FK
    const fks = await client.query(`
      SELECT
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name, 
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='profiles';
    `);
    report.foreign_keys = fks.rows;

    fs.writeFileSync('db_baseline_report.json', JSON.stringify(report, null, 2));
    console.log("Baseline gathered to db_baseline_report.json");

  } catch (e) {
    console.error("Error gathering baseline:", e);
  } finally {
    await client.end();
  }
}

main();
