
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users';" });
  if (error) {
    console.log("Could not get triggers via RPC. Let's try querying profiles policies instead.");
  } else {
    console.log("Triggers:", data);
  }
}

main().catch(console.error);
