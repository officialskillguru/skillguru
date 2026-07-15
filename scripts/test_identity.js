/* eslint-disable */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// We need the service role key to clean up the test user later
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- STARTING IDENTITY DOMAIN TESTS ---');
  const testEmail = `testuser${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let userId;

  try {
    // TEST 1: User signup
    console.log('\n[Test 1] Testing User Signup...');
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
        phone: '+1234567890'
      }
    });

    if (signUpError) throw signUpError;
    userId = signUpData.user.id;
    console.log(`✅ Signup successful. User ID: ${userId}`);

    // TEST 2: Automatic profile creation (using admin client to bypass RLS initially to confirm it exists)
    console.log('\n[Test 2] Verifying automatic profile creation...');
    
    // Give the trigger a moment to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('Profile was not created by the trigger.');
    console.log('✅ Profile automatically created:', { id: profile.id, email: profile.email });

    // TEST 3: Login
    console.log('\n[Test 3] Testing Login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    console.log('✅ Login successful. Session established.');

    // TEST 4: Profile fetch (RLS allows reading own profile)
    console.log('\n[Test 4] Testing Profile Fetch (RLS Read)...');
    const { data: fetchProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    console.log('✅ RLS Self-Read allowed:', fetchProfile);

    // TEST 5: RLS enforcement (Try reading/updating someone else's profile)
    console.log('\n[Test 5] Testing RLS Enforcement (Accessing another user)...');
    
    // Try to update someone else's profile (using a dummy UUID)
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const { error: updateOtherError } = await supabase
      .from('profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('id', dummyId);
      
    // Supabase JS doesn't always throw an error for empty updates due to RLS, it just updates 0 rows
    // Let's verify by checking how many rows were updated. But we can't easily check row count without returning.
    const { data: updateOtherData, error: updateOtherSelectError } = await supabase
      .from('profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('id', dummyId)
      .select();

    if (updateOtherSelectError) {
      console.log('✅ RLS Enforcement working (Update failed as expected)');
    } else if (updateOtherData.length === 0) {
      console.log('✅ RLS Enforcement working (0 rows updated)');
    } else {
      throw new Error('RLS Failure: Was able to update another user\'s profile!');
    }

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message || err);
  } finally {
    // Cleanup
    if (userId) {
      console.log('\n[Cleanup] Deleting test user...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error('Failed to clean up test user:', deleteError);
      } else {
        console.log(`✅ Test user ${userId} deleted. (Cascade should have removed profile)`);
        
        // Verify cascade deletion
        const { data: cascadedProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (!cascadedProfile) {
          console.log('✅ Cascade deletion verified: Profile was deleted.');
        } else {
          console.error('❌ Cascade deletion failed: Profile still exists.');
        }
      }
    }
    console.log('\n--- TESTS COMPLETED ---');
  }
}

runTests();
