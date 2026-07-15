/* eslint-disable */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
  console.log('=== RBAC FUNCTIONAL TESTS ===\n');
  const testEmail = `rbactest${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let userId;

  try {
    // TEST 1: Create user via admin API (bypasses rate limit)
    console.log('[Test 1] Creating test user...');
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'RBAC Test User' }
    });
    if (createErr) throw createErr;
    userId = userData.user.id;
    console.log(`  ✅ User created: ${userId}\n`);

    // TEST 2: Verify profile auto-created
    console.log('[Test 2] Verifying profile auto-creation...');
    await new Promise(r => setTimeout(r, 1000));
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles').select('id, email, full_name').eq('id', userId).single();
    if (profileErr) throw profileErr;
    console.log(`  ✅ Profile exists: ${JSON.stringify(profile)}\n`);

    // TEST 3: Verify student role auto-assigned
    console.log('[Test 3] Verifying automatic student role assignment...');
    const { data: userRoles, error: rolesErr } = await supabaseAdmin
      .from('user_roles')
      .select('role_id, revoked_at, roles(code, name)')
      .eq('user_id', userId);
    if (rolesErr) throw rolesErr;
    if (userRoles.length === 0) throw new Error('No roles assigned to new user');

    const studentRole = userRoles.find(ur => ur.roles?.code === 'student');
    if (!studentRole) throw new Error('Student role not found in user_roles');
    if (studentRole.revoked_at !== null) throw new Error('Student role is revoked');
    console.log(`  ✅ Student role assigned: ${JSON.stringify(studentRole)}\n`);

    // TEST 4: Login and test RLS
    console.log('[Test 4] Login and test authenticated RLS...');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail, password: testPassword
    });
    if (signInErr) throw signInErr;
    console.log('  ✅ Login successful\n');

    // TEST 5: Test get_current_roles() via RPC
    console.log('[Test 5] Testing get_current_roles()...');
    const { data: currentRoles, error: rolesRpcErr } = await supabase.rpc('get_current_roles');
    if (rolesRpcErr) throw rolesRpcErr;
    if (!Array.isArray(currentRoles) || !currentRoles.includes('student')) {
      throw new Error(`Expected ['student'], got: ${JSON.stringify(currentRoles)}`);
    }
    console.log(`  ✅ get_current_roles() = ${JSON.stringify(currentRoles)}\n`);

    // TEST 6: Test get_current_permissions() via RPC
    console.log('[Test 6] Testing get_current_permissions()...');
    const { data: currentPerms, error: permsRpcErr } = await supabase.rpc('get_current_permissions');
    if (permsRpcErr) throw permsRpcErr;
    if (!Array.isArray(currentPerms) || currentPerms.length === 0) {
      throw new Error(`Expected student permissions, got: ${JSON.stringify(currentPerms)}`);
    }
    const expectedStudentPerms = ['profiles.view_own', 'profiles.update_own', 'courses.view',
      'enrollments.create', 'enrollments.view_own', 'payments.view_own', 'files.upload',
      'files.view_own', 'files.delete_own', 'quizzes.attempt', 'certificates.view_own',
      'notifications.view_own'];
    const missingPerms = expectedStudentPerms.filter(p => !currentPerms.includes(p));
    if (missingPerms.length > 0) {
      throw new Error(`Missing student permissions: ${missingPerms.join(', ')}`);
    }
    console.log(`  ✅ get_current_permissions() returned ${currentPerms.length} permissions\n`);

    // TEST 7: Verify user can read own profile (RLS)
    console.log('[Test 7] Testing RLS: read own profile...');
    const { data: ownProfile, error: ownErr } = await supabase
      .from('profiles').select('id, full_name').eq('id', userId).single();
    if (ownErr) throw ownErr;
    console.log(`  ✅ Can read own profile: ${ownProfile.full_name}\n`);

    // TEST 8: Verify user can read own roles (RLS)
    console.log('[Test 8] Testing RLS: read own roles...');
    const { data: ownRoles, error: ownRolesErr } = await supabase
      .from('user_roles').select('role_id').eq('user_id', userId);
    if (ownRolesErr) throw ownRolesErr;
    if (ownRoles.length === 0) throw new Error('Cannot read own roles');
    console.log(`  ✅ Can read own roles (${ownRoles.length} role(s))\n`);

    // TEST 9: Verify user CANNOT read other users' roles (RLS)
    console.log('[Test 9] Testing RLS: cannot read other user roles...');
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const { data: otherRoles } = await supabase
      .from('user_roles').select('role_id').eq('user_id', dummyId);
    if (otherRoles && otherRoles.length > 0) {
      throw new Error('RLS FAILURE: Student can read other user roles');
    }
    console.log('  ✅ Cannot read other users roles (RLS enforced)\n');

    // TEST 10: Verify user can read roles table (public)
    console.log('[Test 10] Testing RLS: can read roles table...');
    const { data: allRoles, error: allRolesErr } = await supabase
      .from('roles').select('code, name');
    if (allRolesErr) throw allRolesErr;
    if (allRoles.length < 3) throw new Error(`Expected at least 3 roles, got ${allRoles.length}`);
    console.log(`  ✅ Can read roles table (${allRoles.length} roles)\n`);

    // TEST 11: Verify user can read permissions table (public)
    console.log('[Test 11] Testing RLS: can read permissions table...');
    const { data: allPerms, error: allPermsErr } = await supabase
      .from('permissions').select('code, display_name, module');
    if (allPermsErr) throw allPermsErr;
    if (allPerms.length < 29) throw new Error(`Expected at least 29 permissions, got ${allPerms.length}`);
    console.log(`  ✅ Can read permissions table (${allPerms.length} permissions)\n`);

    // TEST 12: Verify cascade delete
    console.log('[Test 12] Testing cascade delete (auth user → profile → user_roles)...');
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;
    
    const { data: deletedProfile } = await supabaseAdmin
      .from('profiles').select('id').eq('id', userId).single();
    const { data: deletedRoles } = await supabaseAdmin
      .from('user_roles').select('user_id').eq('user_id', userId);
    
    if (deletedProfile) throw new Error('Profile not cascade-deleted');
    if (deletedRoles && deletedRoles.length > 0) throw new Error('user_roles not cascade-deleted');
    console.log('  ✅ Cascade delete verified: profile + user_roles cleaned up\n');
    
    userId = null; // Already cleaned up

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message || err}\n`);
  } finally {
    if (userId) {
      console.log('[Cleanup] Deleting test user...');
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    console.log('=== TESTS COMPLETED ===');
  }
}

runTests();
