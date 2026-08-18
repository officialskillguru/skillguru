require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase external connections usually
  });
  
  try {
    await client.connect();
    console.log("Connected to database.");

    const sql = `
      DO $$
      DECLARE
        new_user_id uuid := gen_random_uuid();
        admin_role_id uuid;
      BEGIN
        -- Ensure roles exist
        INSERT INTO public.roles (code, name) VALUES 
          ('admin', 'Administrator'),
          ('student', 'Student') 
        ON CONFLICT DO NOTHING;
      
        SELECT id INTO admin_role_id FROM public.roles WHERE code = 'admin';
      
        -- Clean up existing admin if any to avoid unique constraint on email
        DELETE FROM auth.users WHERE email = 'admin@skillguru.com';
      
        -- Create the user in auth.users
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, 
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
          created_at, updated_at
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'admin@skillguru.com', 
          crypt('Admin123!', gen_salt('bf')),
          now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "System Admin"}', 
          now(), now()
        );
      
        -- Upgrade the user to admin
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (new_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
      
      END $$;
    `;
    
    await client.query(sql);
    console.log("SUCCESS");
    
  } catch (err) {
    console.error("Database Error:", err);
  } finally {
    await client.end();
  }
}

main();
