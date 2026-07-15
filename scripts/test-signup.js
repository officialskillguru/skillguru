import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSignup() {
  console.log("Testing Signup...");
  const { data, error } = await supabase.auth.signUp({
    email: `test_user_${Date.now()}@skillguru.com`,
    password: "TestPassword123!",
  });

  if (error) {
    console.error("Signup failed:", error);
    process.exit(1);
  }

  console.log("Signup succeeded!", data.user?.id);

  console.log("Testing AuditService dummy insert to simulate failure...");
  const { error: auditError } = await supabase.from("audit_logs").insert({
    table_name: "profiles",
    record_id: data.user?.id,
    action: "signup",
  });
  
  if (auditError) {
    console.log("Audit log failed as expected with code:", auditError.code, auditError.message);
  } else {
    console.log("Audit log succeeded (unexpected if table missing).");
  }
}

testSignup();
