 
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createRoleUser(roleStr) {
  const email = `test.${roleStr}.${Date.now()}@example.com`;
  const password = `Test@${Math.floor(Math.random() * 1_000_000)}Aa!`;
  
  const { data: user } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `Test ${roleStr}` }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const { data: role } = await adminClient.from("roles").select("id").eq("code", roleStr).single();
  
  if (roleStr !== "student") {
      await adminClient.from("user_roles").insert({ user_id: user.user.id, role_id: role.id });
  }

  console.log(`${roleStr}: ${email} / ${password}`);
}

async function run() {
  await createRoleUser("student");
  await createRoleUser("mentor");
  await createRoleUser("admin");
}

run();
