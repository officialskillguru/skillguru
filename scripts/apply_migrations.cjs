require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    
    try {
        await client.connect();
        console.log("Connected to database.");

        // Drop public schema to ensure clean slate
        console.log("Dropping and recreating public schema...");
        await client.query('DROP SCHEMA public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        await client.query('GRANT ALL ON SCHEMA public TO postgres;');
        await client.query('GRANT ALL ON SCHEMA public TO public;');
        console.log("Clean slate ready.");

        // Apply migrations
        const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
        const files = [
            '001_extensions.sql',
            '002_enums.sql',
            '003_identity.sql'
        ];

        for (const file of files) {
            console.log(`Executing ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query(sql);
            console.log(`Successfully executed ${file}`);
        }
        
    } catch (err) {
        console.error("Error executing migrations:", err);
    } finally {
        await client.end();
    }
}

run();
