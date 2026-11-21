// ============================================================================
// End-to-end check of the resume-builder schema against a LOCAL Supabase stack.
// ============================================================================
//   npx supabase start && npx supabase migration up --local
//   eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
//   API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node tests/manual/verify-resume-builder-local.ts
//
// Refuses to run against anything but localhost. Creates two throwaway users,
// exercises the real auth + PostgREST + RLS + Storage path the app uses, then
// deletes everything it created.
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database.types.ts";

const API_URL = process.env.API_URL ?? "";
const ANON_KEY = process.env.ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API_URL)) {
  console.error("Refusing to run: API_URL must be a local Supabase URL (http://127.0.0.1:54321).");
  process.exit(2);
}

const admin = createClient<Database>(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function makeStudent(tag: string): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const email = `resume-e2e-${tag}-${Date.now()}@example.test`;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `E2E ${tag}` } });
  if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`);
  // Some projects create profiles by trigger; make sure one exists (FK target of resumes.user_id).
  await admin.from("profiles").upsert({ id: data.user.id, email, full_name: `E2E ${tag}` }, { onConflict: "id", ignoreDuplicates: true });
  const client = createClient<Database>(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn ${tag}: ${signInError.message}`);
  return { id: data.user.id, client };
}

const created: string[] = [];
try {
  const alice = await makeStudent("alice");
  const bob = await makeStudent("bob");
  created.push(alice.id, bob.id);

  const { data: r1, error: e1 } = await alice.client
    .from("resumes")
    .insert({ title: "Software Developer Resume", target_role: "Software Developer", template_id: "classic-ats", resume_data: { personal: { fullName: "Alice" } } })
    .select("*")
    .single();
  check("student creates a resume (owner = auth.uid())", !e1 && r1?.user_id === alice.id && r1?.revision === 1, e1?.message);

  const { error: eOwner } = await alice.client.from("resumes").insert({ title: "x", user_id: bob.id } as never);
  check("student cannot choose another owner", !!eOwner, eOwner?.message);

  const { data: bobSees } = await bob.client.from("resumes").select("id").eq("id", r1!.id);
  check("other student cannot read it", (bobSees ?? []).length === 0);
  const { data: bobUpd } = await bob.client.from("resumes").update({ title: "pwned" }).eq("id", r1!.id).select("id");
  check("other student cannot update it", (bobUpd ?? []).length === 0);
  const { data: bobDel } = await bob.client.from("resumes").delete().eq("id", r1!.id).select("id");
  check("other student cannot delete it", (bobDel ?? []).length === 0);

  const { data: saved } = await alice.client.from("resumes").update({ resume_data: { personal: { fullName: "Alice Smith" } } }).eq("id", r1!.id).eq("revision", 1).select("revision");
  check("optimistic save bumps revision", saved?.[0]?.revision === 2);
  const { data: stale } = await alice.client.from("resumes").update({ title: "stale tab" }).eq("id", r1!.id).eq("revision", 1).select("id");
  check("stale save (old revision) matches no rows", (stale ?? []).length === 0);

  const { error: eStatus } = await alice.client.from("resumes").update({ status: "completed" } as never).eq("id", r1!.id);
  check("student cannot set server-managed status", !!eStatus, eStatus?.message);

  const { data: stats } = await alice.client.rpc("get_my_resume_stats");
  check("stats RPC returns the student's own counts", stats?.[0]?.total_count === 1 && stats?.[0]?.draft_count === 1);

  const { data: dup, error: eDup } = await alice.client.rpc("duplicate_resume", { p_resume_id: r1!.id, p_title: "Data Analyst Resume" });
  check("duplicate creates an independent draft", !eDup && dup?.id !== r1!.id && dup?.status === "draft", eDup?.message);
  const { error: eBobDup } = await bob.client.rpc("duplicate_resume", { p_resume_id: r1!.id });
  check("other student cannot duplicate it", !!eBobDup);

  const { data: v1, error: eV } = await alice.client.rpc("create_resume_version", { p_resume_id: r1!.id, p_label: "Initial" });
  check("version snapshot created", !eV && v1?.version_number === 1, eV?.message);
  // Edit after the snapshot (revision 2 -> 3), then restore the snapshot as a new revision (4).
  await alice.client.from("resumes").update({ resume_data: { personal: { fullName: "Changed later" } } }).eq("id", r1!.id).eq("revision", 2);
  const { data: restored, error: eR } = await alice.client.rpc("restore_resume_version", { p_version_id: v1!.id, p_expected_revision: 3 });
  const restoredName = (restored?.resume_data as { personal?: { fullName?: string } } | undefined)?.personal?.fullName;
  check("restore brings back the snapshot as a new revision", !eR && restored?.revision === 4 && restoredName === "Alice Smith", eR?.message);
  const { data: backups } = await alice.client.from("resume_versions").select("source").eq("resume_id", r1!.id);
  check("restore first saved a backup of the current content", (backups ?? []).some((b) => b.source === "restore_backup"));
  const { error: eStale } = await alice.client.rpc("restore_resume_version", { p_version_id: v1!.id, p_expected_revision: 3 });
  check("stale restore is rejected (PT409)", !!eStale && /RESUME_REVISION_CONFLICT/.test(eStale.message));

  const { error: eQuota } = await alice.client.rpc("consume_resume_ai_quota", { p_user_id: alice.id, p_operation: "improve_summary", p_per_minute: 5, p_per_day: 5 });
  check("AI quota RPC is not callable by students", !!eQuota);

  // Storage: private bucket, server-only uploads, owner-only reads.
  const { data: bucket } = await admin.storage.getBucket("student-resumes");
  check("student-resumes bucket exists and is private", bucket?.public === false);
  const path = `${alice.id}/${r1!.id}/v1.pdf`;
  const pdf = new Blob([`%PDF-1.4\n${"%".repeat(2000)}\n%%EOF`], { type: "application/pdf" });
  const { error: eUp } = await alice.client.storage.from("student-resumes").upload(`${alice.id}/${r1!.id}/evil.pdf`, pdf);
  check("student cannot upload into the PDF bucket", !!eUp, eUp?.message);
  const { error: eSvcUp } = await admin.storage.from("student-resumes").upload(path, pdf, { contentType: "application/pdf" });
  check("server (service role) can upload the PDF", !eSvcUp, eSvcUp?.message);
  const { data: aliceUrl } = await alice.client.storage.from("student-resumes").createSignedUrl(path, 60);
  check("owner gets a signed URL for own PDF", !!aliceUrl?.signedUrl);
  const { data: bobUrl, error: eBobUrl } = await bob.client.storage.from("student-resumes").createSignedUrl(path, 60);
  check("other student cannot get a signed URL for it", !bobUrl?.signedUrl && !!eBobUrl);
  const { error: eTxt } = await admin.storage.from("student-resumes").upload(`${alice.id}/${r1!.id}/x.txt`, new Blob(["hi"], { type: "text/plain" }), { contentType: "text/plain" });
  check("bucket rejects non-PDF files", !!eTxt, eTxt?.message);

  // Deletion as the app does it: files first, then the row (versions/jobs cascade).
  const { error: eRm } = await alice.client.storage.from("student-resumes").remove([path]);
  const { error: eDel } = await alice.client.from("resumes").delete().eq("id", r1!.id);
  const { data: leftVersions } = await admin.from("resume_versions").select("id").eq("resume_id", r1!.id);
  check("owner deletes files + resume; versions cascade", !eRm && !eDel && (leftVersions ?? []).length === 0, eRm?.message ?? eDel?.message);
} catch (error) {
  failures++;
  console.log(`FAIL  unexpected error: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  for (const id of created) {
    await admin.from("resumes").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

console.log(failures === 0 ? "\nAll local end-to-end checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
