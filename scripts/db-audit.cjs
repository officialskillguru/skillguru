const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function audit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const report = {};

  try {
    // 1. Schemas
    const schemasRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_internal')
    `);
    report.schemas = schemasRes.rows.map(r => r.schema_name);

    // 2. Tables and Columns
    const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_internal')
    `);
    report.tables = {};
    for (const { table_schema, table_name } of tablesRes.rows) {
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [table_schema, table_name]);
      
      if (!report.tables[table_schema]) report.tables[table_schema] = {};
      report.tables[table_schema][table_name] = colsRes.rows;
    }

    // 3. RLS Policies
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies
    `);
    report.policies = policiesRes.rows;

    // 4. Triggers
    const triggersRes = await client.query(`
      SELECT event_object_schema, event_object_table, trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema NOT IN ('information_schema', 'pg_catalog')
    `);
    report.triggers = triggersRes.rows;
    
    // Additional pg_trigger query for auth schema because information_schema sometimes misses system schemas
    const authTriggersRes = await client.query(`
      SELECT tgname, relname, nspname
      FROM pg_trigger 
      JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE nspname = 'auth'
    `);
    report.authTriggers = authTriggersRes.rows;

    // 5. Migrations
    const migrationsRes = await client.query(`
      SELECT version, name, statements 
      FROM supabase_migrations.schema_migrations
      ORDER BY version ASC
    `).catch(() => ({ rows: [] }));
    report.migrations = migrationsRes.rows.map(r => ({ version: r.version, name: r.name }));

    fs.writeFileSync('db-audit.json', JSON.stringify(report, null, 2));
    console.log('Audit complete, saved to db-audit.json');

  } catch (err) {
    console.error('Error during audit', err);
  } finally {
    await client.end();
  }
}

audit();
