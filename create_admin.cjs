require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  try {
    console.log("Seeding roles...");
    await supabase.from('roles').upsert([
      { code: 'admin', name: 'Administrator', description: 'Admin' },
      { code: 'mentor', name: 'Mentor', description: 'Mentor' },
      { code: 'student', name: 'Student', description: 'Student' }
    ], { onConflict: 'code' });
    
    console.log("Roles seeded. Creating user...");
    
    const email = `admin_${Date.now()}@skillguru.local`;
    const password = `Admin@${Math.floor(Math.random() * 10000)}!`;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Super Admin' }
    });

    if (authError) throw new Error(`Auth Error: ${authError.message}`);
    
    const userId = authData.user.id;
    console.log("Created user:", userId);
    
    const { data: roleData } = await supabase.from('roles').select('id').eq('code', 'admin').single();

    // Assign admin role (trigger assigned student, we add admin)
    const { error: assignError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' });

    if (assignError) throw new Error(`Assign Error: ${assignError.message}`);

    // handle_new_user() unconditionally grants every new auth.users row the default
    // 'student' role - revoke it now that the real role is assigned, or this admin
    // would also show up in every student-scoped list/RLS check (same bug class
    // fixed for create-mentor/create-counsellor in commit 770d53b).
    const { data: studentRoleData } = await supabase.from('roles').select('id').eq('code', 'student').maybeSingle();
    if (studentRoleData) {
      const { error: revokeError } = await supabase
        .from('user_roles')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('role_id', studentRoleData.id)
        .is('revoked_at', null);
      if (revokeError) console.error("Revoke Student Role Error:", revokeError.message);
    }

    console.log("SUCCESS");
    console.log("USERNAME:", email);
    console.log("PASSWORD:", password);
    
  } catch (err) {
    console.error(err.message);
  }
}

main();
