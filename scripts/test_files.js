 
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
  console.log('=== FILES DOMAIN FUNCTIONAL TESTS ===\n');
  const testEmail1 = `filetest1_${Date.now()}@example.com`;
  const testEmail2 = `filetest2_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let userId1, userId2;

  try {
    // ------ SETUP: Create two test users ------
    console.log('[Setup] Creating two test users...');
    const { data: u1 } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail1, password: testPassword, email_confirm: true,
      user_metadata: { full_name: 'File Test User 1' }
    });
    const { data: u2 } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail2, password: testPassword, email_confirm: true,
      user_metadata: { full_name: 'File Test User 2' }
    });
    userId1 = u1.user.id;
    userId2 = u2.user.id;
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  User 1: ${userId1}\n  User 2: ${userId2}\n`);

    // ------ TEST 1: Login as User 1 and insert a private file ------
    console.log('[Test 1] Login as User 1, insert private file...');
    const { error: loginErr1 } = await supabase.auth.signInWithPassword({
      email: testEmail1, password: testPassword
    });
    if (loginErr1) throw loginErr1;

    const { data: privateFile, error: insertErr } = await supabase
      .from('files')
      .insert({
        original_name: 'my_resume.pdf',
        stored_name: `${userId1}_resume.pdf`,
        mime_type: 'application/pdf',
        size_bytes: 204800,
        bucket: 'documents',
        object_key: `users/${userId1}/resume.pdf`,
        storage_path: `documents/users/${userId1}/resume.pdf`,
        is_public: false,
        uploaded_by: userId1
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    console.log(`  ✅ Private file inserted: ${privateFile.id}\n`);

    // ------ TEST 2: Insert a public file (avatar) ------
    console.log('[Test 2] Insert public file (avatar)...');
    const { data: publicFile, error: pubInsertErr } = await supabase
      .from('files')
      .insert({
        original_name: 'avatar.jpg',
        stored_name: `${userId1}_avatar.jpg`,
        mime_type: 'image/jpeg',
        size_bytes: 51200,
        bucket: 'avatars',
        object_key: `users/${userId1}/avatar.jpg`,
        storage_path: `avatars/users/${userId1}/avatar.jpg`,
        is_public: true,
        uploaded_by: userId1
      })
      .select()
      .single();
    if (pubInsertErr) throw pubInsertErr;
    console.log(`  ✅ Public file inserted: ${publicFile.id}\n`);

    // ------ TEST 3: User 1 can read own files ------
    console.log('[Test 3] User 1 reads own files...');
    const { data: ownFiles, error: ownErr } = await supabase
      .from('files')
      .select('id, original_name, is_public')
      .eq('uploaded_by', userId1);
    if (ownErr) throw ownErr;
    if (ownFiles.length !== 2) throw new Error(`Expected 2 files, got ${ownFiles.length}`);
    console.log(`  ✅ User 1 sees ${ownFiles.length} own files\n`);

    // ------ TEST 4: User 1 CANNOT insert a file owned by User 2 (RLS) ------
    console.log('[Test 4] User 1 cannot insert file claiming User 2 as owner...');
    const { error: impersonateErr } = await supabase
      .from('files')
      .insert({
        original_name: 'evil.pdf',
        stored_name: 'evil.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        bucket: 'documents',
        object_key: 'evil/path.pdf',
        storage_path: 'documents/evil/path.pdf',
        is_public: false,
        uploaded_by: userId2  // impersonation attempt
      });
    if (!impersonateErr) {
      throw new Error('RLS FAILURE: User 1 could insert a file owned by User 2');
    }
    console.log(`  ✅ RLS blocked impersonation: ${impersonateErr.message}\n`);

    // ------ TEST 5: Login as User 2, check visibility ------
    console.log('[Test 5] Login as User 2, check file visibility...');
    const { error: loginErr2 } = await supabase.auth.signInWithPassword({
      email: testEmail2, password: testPassword
    });
    if (loginErr2) throw loginErr2;

    // User 2 should see the PUBLIC file but NOT the private file
    const { data: user2Files, error: u2FilesErr } = await supabase
      .from('files')
      .select('id, original_name, is_public, uploaded_by');
    if (u2FilesErr) throw u2FilesErr;

    const seesPrivate = user2Files.some(f => f.id === privateFile.id);
    const seesPublic = user2Files.some(f => f.id === publicFile.id);

    if (seesPrivate) throw new Error('RLS FAILURE: User 2 can see User 1 private file');
    if (!seesPublic) throw new Error('RLS FAILURE: User 2 cannot see public file');
    console.log(`  ✅ User 2 sees ${user2Files.length} file(s): public only, private blocked\n`);

    // ------ TEST 6: User 2 cannot update User 1's file ------
    console.log('[Test 6] User 2 cannot update User 1 file...');
    const { data: updData } = await supabase
      .from('files')
      .update({ original_name: 'hacked.pdf' })
      .eq('id', privateFile.id)
      .select();
    if (updData && updData.length > 0) {
      throw new Error('RLS FAILURE: User 2 could update User 1 file');
    }
    console.log('  ✅ RLS blocked cross-user update (0 rows affected)\n');

    // ------ TEST 7: Link avatar to profile (deferred FK test) ------
    console.log('[Test 7] Link avatar to profile (deferred FK)...');
    // Login back as User 1
    await supabase.auth.signInWithPassword({ email: testEmail1, password: testPassword });

    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ avatar_file_id: publicFile.id })
      .eq('id', userId1);
    if (linkErr) throw linkErr;

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('avatar_file_id')
      .eq('id', userId1)
      .single();
    if (updatedProfile.avatar_file_id !== publicFile.id) {
      throw new Error('Avatar file ID not saved to profile');
    }
    console.log(`  ✅ profiles.avatar_file_id linked to files.id\n`);

    // ------ TEST 8: FK enforcement — invalid file ID rejected ------
    console.log('[Test 8] FK enforcement — invalid file ID rejected...');
    const fakeFileId = '00000000-0000-0000-0000-000000000099';
    const { error: fkErr } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_file_id: fakeFileId })
      .eq('id', userId1);
    if (!fkErr) {
      throw new Error('FK VIOLATION: profiles accepted a non-existent file ID');
    }
    console.log(`  ✅ FK constraint enforced: ${fkErr.message.substring(0, 80)}\n`);

    // ------ TEST 9: CHECK constraints — zero-size file rejected ------
    console.log('[Test 9] CHECK constraints — zero-size file rejected...');
    const { error: checkErr } = await supabaseAdmin
      .from('files')
      .insert({
        original_name: 'empty.txt',
        stored_name: 'empty.txt',
        mime_type: 'text/plain',
        size_bytes: 0,  // violates CHECK
        bucket: 'test',
        object_key: 'test/empty.txt',
        storage_path: 'test/test/empty.txt',
        uploaded_by: userId1
      });
    if (!checkErr) {
      throw new Error('CHECK VIOLATION: files accepted size_bytes = 0');
    }
    console.log(`  ✅ CHECK constraint enforced: size_bytes > 0\n`);

    // ------ TEST 10: Cascade — delete file → profile.avatar_file_id SET NULL ------
    console.log('[Test 10] Cascade — delete file → avatar_file_id SET NULL...');
    // Use admin to hard-delete the file
    const { error: delErr } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', publicFile.id);
    if (delErr) throw delErr;

    const { data: postDeleteProfile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_file_id')
      .eq('id', userId1)
      .single();
    if (postDeleteProfile.avatar_file_id !== null) {
      throw new Error('FK SET NULL FAILURE: avatar_file_id not nulled after file deletion');
    }
    console.log('  ✅ profiles.avatar_file_id = null after file deletion\n');

    // ------ TEST 11: Cascade — delete auth user → profile → files.uploaded_by SET NULL ------
    console.log('[Test 11] Cascade — delete user → files.uploaded_by SET NULL...');
    // privateFile still exists, owned by userId1
    const { error: userDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId1);
    if (userDelErr) throw userDelErr;

    const { data: orphanedFile } = await supabaseAdmin
      .from('files')
      .select('id, uploaded_by')
      .eq('id', privateFile.id)
      .single();
    if (!orphanedFile) throw new Error('File was deleted when user was deleted (should be preserved)');
    if (orphanedFile.uploaded_by !== null) {
      throw new Error(`uploaded_by should be NULL, got: ${orphanedFile.uploaded_by}`);
    }
    console.log('  ✅ File preserved, uploaded_by = null (course content survives mentor removal)\n');

    userId1 = null; // Already cleaned up

    // Cleanup orphaned file
    await supabaseAdmin.from('files').delete().eq('id', privateFile.id);

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message || err}\n`);
  } finally {
    // Cleanup
    if (userId1) {
      await supabaseAdmin.auth.admin.deleteUser(userId1);
    }
    if (userId2) {
      await supabaseAdmin.auth.admin.deleteUser(userId2);
    }
    console.log('=== TESTS COMPLETED ===');
  }
}

runTests();
