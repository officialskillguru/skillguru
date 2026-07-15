/* eslint-disable */
 
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing credentials.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTest() {
  console.log("--- Starting Admin E2E Verification ---");

  const email = `test.student.${Date.now()}@example.com`;
  const password = "Password123!";

  console.log(`\n1. Creating User via Admin API (${email})...`);
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Test Admin User" }
  });

  if (userError) {
    console.error("Failed to create user:", userError);
    process.exit(1);
  }

  const userId = userData.user.id;
  console.log("✅ User created successfully. ID:", userId);

  console.log("\n2. Verifying trigger cascade (profiles, user_roles)...");
  // Give trigger a moment
  await new Promise(r => setTimeout(r, 1000));

  const { data: profile } = await adminClient.from("profiles").select("*").eq("id", userId).single();
  if (!profile) {
    console.error("Profile missing!");
    process.exit(1);
  }
  console.log("✅ Profile exists.");

  const { data: roles, error: rolesError } = await adminClient.from("user_roles").select("roles(code)").eq("user_id", userId);
  if (rolesError) {
      console.error("Error fetching roles:", rolesError.message);
  }
  const assigned = roles?.map(r => r.roles?.code) || [];
  if (!assigned.includes("student")) {
    console.error("Expected 'student' role! Got:", assigned, "Raw rows:", roles);
    process.exit(1);
  }
  console.log("✅ Roles assigned properly:", assigned);

  console.log("\n3. Testing Identity RPC (get_current_identity)...");
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error("Sign in failed:", signInError);
    process.exit(1);
  }
  

  const { data: identity, error: idError } = await anonClient.rpc("get_current_identity");
  if (idError) {
    console.error("RPC Failed:", idError);
    process.exit(1);
  }
  
  console.log("✅ RPC returned identity payload:");
  console.log(JSON.stringify(identity, null, 2));

  console.log("\n4. Elevating user to Mentor manually...");
  // Find mentor role id
  const { data: mentorRole } = await adminClient.from("roles").select("id").eq("code", "mentor").single();
  await adminClient.from("user_roles").insert({ user_id: userId, role_id: mentorRole.id });
  
  // Refresh identity
  const { data: identity2 } = await anonClient.rpc("get_current_identity");
  console.log("✅ Elevated roles:", identity2.roles);
  if (!identity2.roles.includes("mentor")) {
    console.error("Mentor role not found in identity after elevation!");
    process.exit(1);
  }

  console.log("\n✅ All Authentication API flows verified successfully.");
}

runTest().catch(console.error);
