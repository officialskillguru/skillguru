 
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
   
  console.log("Gathering baseline using Supabase REST API...");
  
  // Get all users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
     
    console.error("Error fetching users:", usersError);
    return;
  }
  
  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id');
    
  if (profilesError) {
     
    console.error("Error fetching profiles:", profilesError);
    return;
  }

  const profileIds = new Set(profiles.map(p => p.id));
  const orphans = users.users.filter(u => !profileIds.has(u.id));

  console.log("=== DATABASE BASELINE ===");
  console.log(`Total auth.users: ${users.users.length}`);
  console.log(`Total public.profiles: ${profiles.length}`);
  console.log(`Total orphaned users: ${orphans.length}`);
  if (orphans.length > 0) {
    console.log("Orphans:", orphans.map(u => u.email).join(", "));
  }
}

main().catch(console.error);
