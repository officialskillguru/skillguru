/**
 * RLS / CRUD integration check against the live Supabase project.
 *
 *   node scripts/qa/rls-crud-check.mjs
 *
 * Signs in as each review account (passwords from env E2E_<ROLE>_PASSWORD or
 * the git-ignored SKILLGURU_REVIEW_CREDENTIALS.txt — never printed) and runs
 * real operations through the anon key, so Row Level Security is exercised
 * exactly as the browser would. Every check asserts the EXPECTED outcome:
 * allowed operations must succeed and forbidden ones must be rejected.
 *
 * Rows created here are tracked by id and removed at the end with the
 * service-role key (only those ids). Exception: the student's enrollment in a
 * free demo course is kept on purpose so the student panel has real data.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: join(root, ".env"), quiet: true });

const URL_ = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILS = { admin: "admin@skillguru.local", counsellor: "counsellor@skillguru.local", student: "student@skillguru.local", teacher: "teacher@skillguru.local" };
const TAG = `QA-AUTO-${Date.now()}`;
const FREE_DEMO_COURSE = "html-css-beginners";
const PAID_DEMO_COURSE = "full-stack-react-node";

function password(role) {
  const env = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  if (env) return env;
  const file = join(root, "SKILLGURU_REVIEW_CREDENTIALS.txt");
  if (!existsSync(file)) throw new Error("No credentials available");
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.includes(` ${EMAILS[role]} `));
  return line?.trim().split(/\s+/).pop();
}

const service = createClient(URL_, SERVICE, { auth: { persistSession: false } });
async function as(role) {
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email: EMAILS[role], password: password(role) });
  if (error) throw new Error(`${role} login failed: ${error.message}`);
  return { sb, id: data.user.id };
}

const results = [];
const cleanup = []; // [table, id]
function record(area, name, pass, detail = "") {
  results.push({ area, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}
const allowed = (area, name, res) => record(area, name, !res.error && (res.data === undefined || res.data === null || !Array.isArray(res.data) || res.data.length > 0 || res.count !== undefined), res.error?.message ?? "");
/** Forbidden write: must error OR affect zero rows. */
const denied = (area, name, res) => {
  const affected = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0;
  record(area, name, !!res.error || affected === 0, res.error ? `rejected: ${res.error.message.slice(0, 80)}` : `affected ${affected} row(s)`);
};

async function main() {
  const admin = await as("admin");
  const teacher = await as("teacher");
  const student = await as("student");
  const counsellor = await as("counsellor");
  record("auth", "all four review accounts sign in", true);

  // ---------------------------------------------------------------- auth / profiles
  for (const [role, u, expected] of [["admin", admin, "admin"], ["teacher", teacher, "mentor"], ["student", student, "student"], ["counsellor", counsellor, "counsellor"]]) {
    const roles = await u.sb.rpc("get_current_roles");
    record("auth", `${role} has exactly role '${expected}'`, !roles.error && JSON.stringify(roles.data) === JSON.stringify([expected]), JSON.stringify(roles.data ?? roles.error?.message));
    const prof = await u.sb.from("profiles").select("id, email, full_name").eq("id", u.id).single();
    record("auth", `${role} profile record exists`, !prof.error && prof.data?.email === EMAILS[role], prof.error?.message ?? "");
  }

  const demoFree = (await service.from("courses").select("id").eq("slug", FREE_DEMO_COURSE).single()).data;
  const demoPaid = (await service.from("courses").select("id, mentor_id, title").eq("slug", PAID_DEMO_COURSE).single()).data;

  // ---------------------------------------------------------------- teacher / mentor
  const created = await teacher.sb.from("courses").insert({ title: `${TAG} Draft Course`, slug: `${TAG.toLowerCase()}-draft`, mentor_id: teacher.id, status: "draft", what_you_will_learn: [], requirements: [] }).select("id").single();
  record("teacher", "create own draft course", !created.error, created.error?.message ?? "");
  const courseId = created.data?.id;
  if (courseId) cleanup.push(["courses", courseId]);

  denied("teacher", "cannot create a course directly as published", await teacher.sb.from("courses").insert({ title: `${TAG} Published`, slug: `${TAG.toLowerCase()}-pub`, mentor_id: teacher.id, status: "published", what_you_will_learn: [], requirements: [] }).select("id"));
  denied("teacher", "cannot create a course owned by another mentor", await teacher.sb.from("courses").insert({ title: `${TAG} Spoof`, slug: `${TAG.toLowerCase()}-spoof`, mentor_id: demoPaid.mentor_id, status: "draft", what_you_will_learn: [], requirements: [] }).select("id"));

  if (courseId) {
    allowed("teacher", "edit own course", await teacher.sb.from("courses").update({ short_description: "QA edit" }).eq("id", courseId).select("id"));
    const mod = await teacher.sb.from("modules").insert({ course_id: courseId, title: `${TAG} Module`, sort_order: 0 }).select("id").single();
    record("teacher", "create module in own course", !mod.error, mod.error?.message ?? "");
    if (mod.data) {
      cleanup.push(["modules", mod.data.id]);
      const les = await teacher.sb.from("lessons").insert({ module_id: mod.data.id, title: `${TAG} Lesson`, content_type: "text", text_content: "QA", sort_order: 0 }).select("id").single();
      record("teacher", "create lesson in own module", !les.error, les.error?.message ?? "");
      if (les.data) {
        cleanup.push(["lessons", les.data.id]);
        allowed("teacher", "edit own lesson", await teacher.sb.from("lessons").update({ title: `${TAG} Lesson (edited)` }).eq("id", les.data.id).select("id"));
      }
    }
    // Storage: thumbnail upload into own course folder.
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");
    const up = await teacher.sb.storage.from("courses").upload(`${courseId}/qa-thumb.png`, png, { contentType: "image/png", upsert: true });
    record("storage", "teacher uploads image to own course folder", !up.error, up.error?.message ?? "");
    if (!up.error) cleanup.push(["storage:courses", `${courseId}/qa-thumb.png`]);
    const badType = await teacher.sb.storage.from("courses").upload(`${courseId}/qa.exe`, Buffer.from("MZ"), { contentType: "application/x-msdownload", upsert: true });
    record("storage", "bucket rejects disallowed MIME type", !!badType.error, badType.error ? `rejected: ${badType.error.message}` : "accepted!");
    if (!badType.error) cleanup.push(["storage:courses", `${courseId}/qa.exe`]);

    const submit = await teacher.sb.from("courses").update({ status: "under_review" }).eq("id", courseId).select("id");
    allowed("teacher", "submit own draft for review (draft → under_review)", submit);
    denied("teacher", "cannot self-publish (under_review → published)", await teacher.sb.from("courses").update({ status: "published" }).eq("id", courseId).select("id"));
  }
  denied("teacher", "cannot edit another mentor's course", await teacher.sb.from("courses").update({ short_description: "hijack" }).eq("id", demoPaid.id).select("id"));
  const otherMod = (await service.from("modules").select("id").eq("course_id", demoPaid.id).limit(1).single()).data;
  denied("teacher", "cannot add a module to another mentor's course", await teacher.sb.from("modules").insert({ course_id: demoPaid.id, title: `${TAG} intrude`, sort_order: 99 }).select("id"));
  denied("teacher", "cannot add a lesson to another mentor's module", await teacher.sb.from("lessons").insert({ module_id: otherMod.id, title: `${TAG} intrude`, content_type: "text", sort_order: 99 }).select("id"));
  const upOther = await teacher.sb.storage.from("courses").upload(`${demoPaid.id}/qa-intrude.png`, Buffer.from("x"), { contentType: "image/png" });
  record("storage", "teacher cannot upload into another course's folder", !!upOther.error, upOther.error ? "rejected" : "accepted!");
  if (!upOther.error) cleanup.push(["storage:courses", `${demoPaid.id}/qa-intrude.png`]);

  // ---------------------------------------------------------------- admin
  if (courseId) {
    allowed("admin", "publish a course under review", await admin.sb.from("courses").update({ status: "published" }).eq("id", courseId).select("id"));
    allowed("admin", "archive a course", await admin.sb.from("courses").update({ status: "archived" }).eq("id", courseId).select("id"));
  }
  const cat = await admin.sb.from("categories").insert({ name: `${TAG} Category`, slug: `${TAG.toLowerCase()}-cat`, status: "active" }).select("id, status").single();
  record("admin", "create category", !cat.error, cat.error?.message ?? `status=${cat.data?.status}`);
  if (cat.data) cleanup.push(["categories", cat.data.id]);
  const allEnr = await admin.sb.from("enrollments").select("id", { count: "exact", head: true });
  record("admin", "read all enrollments", !allEnr.error, allEnr.error?.message ?? `count=${allEnr.count}`);
  const allRoles = await admin.sb.from("user_roles").select("user_id", { count: "exact", head: true });
  record("admin", "read user role assignments", !allRoles.error && (allRoles.count ?? 0) > 4, allRoles.error?.message ?? `count=${allRoles.count}`);
  const notif = await admin.sb.from("notifications").insert({ recipient_id: student.id, sender_id: admin.id, type: "announcement", title: `${TAG} Notice`, message: "QA notification" }).select("id").single();
  record("notifications", "admin sends a notification to a student", !notif.error, notif.error?.message ?? "");
  if (notif.data) cleanup.push(["notifications", notif.data.id]);

  // ---------------------------------------------------------------- student
  const draftView = courseId ? await student.sb.from("courses").select("id").eq("id", courseId) : { data: [] };
  record("student", "cannot see an archived/unpublished course", (draftView.data ?? []).length === 0);
  const lockedBefore = await student.sb.from("lessons").select("id, text_content, is_free_preview").eq("module_id", otherMod.id).eq("is_free_preview", false);
  record("student", "cannot read paid lesson content without enrollment", (lockedBefore.data ?? []).length === 0, `${(lockedBefore.data ?? []).length} rows visible`);
  denied("student", "cannot self-enroll in a paid course by direct insert", await student.sb.from("enrollments").insert({ student_id: student.id, course_id: demoPaid.id, enrollment_source: "manual" }).select("id"));
  denied("student", "cannot create courses", await student.sb.from("courses").insert({ title: `${TAG} x`, slug: `${TAG.toLowerCase()}-stu`, mentor_id: student.id, status: "draft", what_you_will_learn: [], requirements: [] }).select("id"));
  denied("student", "cannot edit published courses", await student.sb.from("courses").update({ title: "hacked" }).eq("id", demoPaid.id).select("id"));
  denied("student", "cannot grant itself the admin role", await student.sb.from("user_roles").insert({ user_id: student.id, role_id: (await service.from("roles").select("id").eq("code", "admin").single()).data.id }).select("user_id"));
  denied("student", "cannot edit another user's profile", await student.sb.from("profiles").update({ full_name: "hacked" }).eq("id", teacher.id).select("id"));
  const otherProfiles = await student.sb.from("profiles").select("id, email").neq("id", student.id);
  record("student", "cannot list other users' profiles/emails", (otherProfiles.data ?? []).length === 0, `${(otherProfiles.data ?? []).length} visible`);
  allowed("student", "update own profile", await student.sb.from("profiles").update({ city: "Pune" }).eq("id", student.id).select("id"));

  const enroll = await student.sb.functions.invoke("enroll-free", { body: { courseId: demoFree.id } });
  const enrolledRow = await student.sb.from("enrollments").select("id, status").eq("student_id", student.id).eq("course_id", demoFree.id).maybeSingle();
  record("enrollment", "student enrolls in a free course via enroll-free", !!enrolledRow.data, enroll.error ? `function error: ${enroll.error.message}` : "");
  const enrollPaidFn = await student.sb.functions.invoke("enroll-free", { body: { courseId: demoPaid.id } });
  const paidRow = await student.sb.from("enrollments").select("id").eq("student_id", student.id).eq("course_id", demoPaid.id).maybeSingle();
  record("enrollment", "enroll-free refuses a paid course", !paidRow.data, enrollPaidFn.error ? "rejected" : "no enrollment created");
  if (enrolledRow.data) {
    const freeMod = (await service.from("modules").select("id").eq("course_id", demoFree.id).order("sort_order").limit(2)).data;
    const unlocked = await student.sb.from("lessons").select("id, text_content").eq("module_id", freeMod[1].id);
    record("enrollment", "enrolled student can read lesson content", (unlocked.data ?? []).length > 0 && !!unlocked.data[0].text_content, `${(unlocked.data ?? []).length} lessons`);
    const firstLesson = unlocked.data?.[0];
    if (firstLesson) {
      const prog = await student.sb.from("lesson_progress").upsert({ enrollment_id: enrolledRow.data.id, lesson_id: firstLesson.id, status: "completed" }, { onConflict: "enrollment_id,lesson_id" }).select("id");
      record("enrollment", "student records lesson progress", !prog.error, prog.error?.message ?? "");
    }
  }
  const wish = await student.sb.from("wishlists").insert({ user_id: student.id, course_id: demoPaid.id }).select("id").single();
  record("student", "add course to own wishlist", !wish.error, wish.error?.message ?? "");
  if (wish.data) cleanup.push(["wishlists", wish.data.id]);
  denied("student", "cannot add to another user's wishlist", await student.sb.from("wishlists").insert({ user_id: teacher.id, course_id: demoPaid.id }).select("id"));
  const myNotif = await student.sb.from("notifications").select("id, title").eq("recipient_id", student.id).like("title", `${TAG}%`);
  record("notifications", "student receives the admin notification", (myNotif.data ?? []).length === 1, myNotif.error?.message ?? "");
  if (myNotif.data?.[0]) allowed("notifications", "student marks notification read", await student.sb.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", myNotif.data[0].id).select("id"));
  const othersNotif = await teacher.sb.from("notifications").select("id").like("title", `${TAG}%`);
  record("notifications", "other users cannot read the student's notification", (othersNotif.data ?? []).length === 0);
  const supUp = await student.sb.storage.from("students").upload(`${student.id}/qa-doc.pdf`, Buffer.from("%PDF-1.4\n%QA\n"), { contentType: "application/pdf", upsert: true });
  record("storage", "student uploads a PDF to own folder", !supUp.error, supUp.error?.message ?? "");
  if (!supUp.error) cleanup.push(["storage:students", `${student.id}/qa-doc.pdf`]);
  const supOther = await student.sb.storage.from("students").upload(`${teacher.id}/qa-intrude.pdf`, Buffer.from("%PDF"), { contentType: "application/pdf" });
  record("storage", "student cannot upload into another user's folder", !!supOther.error, supOther.error ? "rejected" : "accepted!");
  if (!supOther.error) cleanup.push(["storage:students", `${teacher.id}/qa-intrude.pdf`]);
  const adminBucket = await student.sb.storage.from("admins").upload(`${student.id}/qa.pdf`, Buffer.from("%PDF"), { contentType: "application/pdf" });
  record("storage", "student cannot upload to the admins bucket", !!adminBucket.error, adminBucket.error ? "rejected" : "accepted!");
  if (!adminBucket.error) cleanup.push(["storage:admins", `${student.id}/qa.pdf`]);

  // ---------------------------------------------------------------- counsellor
  const lead = await counsellor.sb.from("leads").insert({ name: `${TAG} Lead`, email: "qa-lead@example.com", status: "new", course_interest_id: demoPaid.id }).select("id").single();
  record("counsellor", "create a lead", !lead.error, lead.error?.message ?? "");
  if (lead.data) {
    cleanup.push(["leads", lead.data.id]);
    allowed("counsellor", "update lead status", await counsellor.sb.from("leads").update({ status: "contacted" }).eq("id", lead.data.id).select("id"));
    const fu = await counsellor.sb.from("lead_followups").insert({ lead_id: lead.data.id, assigned_to: counsellor.id, type: "call", scheduled_at: new Date(Date.now() + 86400000).toISOString() }).select("id").single();
    record("counsellor", "schedule a lead follow-up", !fu.error, fu.error?.message ?? "");
    if (fu.data) {
      cleanup.push(["lead_followups", fu.data.id]);
      allowed("counsellor", "complete a follow-up", await counsellor.sb.from("lead_followups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", fu.data.id).select("id"));
    }
    const studentLeadView = await student.sb.from("leads").select("id").eq("id", lead.data.id);
    record("counsellor", "students cannot read CRM leads", (studentLeadView.data ?? []).length === 0);
  }
  const cStudents = await counsellor.sb.from("profiles").select("id").neq("id", counsellor.id);
  record("counsellor", "can list students", !cStudents.error && (cStudents.data ?? []).length > 0, cStudents.error?.message ?? `${(cStudents.data ?? []).length} visible`);
  denied("counsellor", "cannot edit courses", await counsellor.sb.from("courses").update({ title: "hacked" }).eq("id", demoPaid.id).select("id"));
  denied("counsellor", "cannot assign roles", await counsellor.sb.from("user_roles").insert({ user_id: counsellor.id, role_id: (await service.from("roles").select("id").eq("code", "admin").single()).data.id }).select("user_id"));
  const settingsWrite = await counsellor.sb.from("system_settings").insert({ id: `${TAG}-setting`, value: {} }).select("id");
  denied("counsellor", "cannot write system settings", settingsWrite);
  if (settingsWrite.data?.length) cleanup.push(["system_settings", `${TAG}-setting`]);

  // ---------------------------------------------------------------- messaging
  for (const [role, u] of [["counsellor", counsellor], ["teacher", teacher]]) {
    const rec = await u.sb.rpc("list_authorized_message_recipients");
    record("messaging", `${role} loads authorised recipient directory`, !rec.error, rec.error?.message ?? `${(rec.data ?? []).length} recipients`);
  }
  // Business rule (start_direct_conversation): counsellor <-> mentor/admin,
  // mentor <-> students enrolled in their courses. Counsellor -> student is
  // intentionally not allowed.
  const blocked = await student.sb.rpc("start_direct_conversation", { p_other_user_id: teacher.id });
  record("messaging", "student cannot message a mentor they are not enrolled with", !!blocked.error, blocked.error?.message ?? "allowed!");
  const conv = await counsellor.sb.rpc("start_direct_conversation", { p_other_user_id: teacher.id });
  record("messaging", "counsellor starts a conversation with a teacher", !conv.error && !!conv.data, conv.error?.message ?? "");
  const convId = typeof conv.data === "string" ? conv.data : conv.data?.id ?? conv.data?.conversation_id;
  if (convId) {
    cleanup.push(["conversation_members:conversation_id", convId]);
    cleanup.push(["conversations", convId]);
    const msg = await counsellor.sb.from("chat_messages").insert({ conversation_id: convId, sender_id: counsellor.id, content: `${TAG} hello` }).select("id").single();
    record("messaging", "counsellor sends a message", !msg.error, msg.error?.message ?? "");
    if (msg.data) cleanup.push(["chat_messages", msg.data.id]);
    const seen = await teacher.sb.from("chat_messages").select("id").eq("conversation_id", convId).like("content", `${TAG}%`);
    record("messaging", "teacher receives the message", (seen.data ?? []).length === 1, seen.error?.message ?? "");
    const reply = await teacher.sb.from("chat_messages").insert({ conversation_id: convId, sender_id: teacher.id, content: `${TAG} reply` }).select("id").single();
    record("messaging", "teacher replies", !reply.error, reply.error?.message ?? "");
    if (reply.data) cleanup.push(["chat_messages", reply.data.id]);
    const outsider = await student.sb.from("chat_messages").select("id").eq("conversation_id", convId);
    record("messaging", "non-participants cannot read the conversation", (outsider.data ?? []).length === 0);
    denied("messaging", "cannot send a message impersonating another user", await teacher.sb.from("chat_messages").insert({ conversation_id: convId, sender_id: counsellor.id, content: `${TAG} spoof` }).select("id"));
    denied("messaging", "non-participants cannot post into the conversation", await student.sb.from("chat_messages").insert({ conversation_id: convId, sender_id: student.id, content: `${TAG} intrude` }).select("id"));
  }
}

async function runCleanup() {
  // Reverse order so children go before parents.
  for (const [table, id] of cleanup.reverse()) {
    if (table.startsWith("storage:")) await service.storage.from(table.split(":")[1]).remove([id]);
    else if (table.includes(":")) { const [t, col] = table.split(":"); await service.from(t).delete().eq(col, id); }
    else await service.from(table).delete().eq("id", id);
  }
  // Any lesson_progress rows created for the kept enrollment are real activity and kept.
}

try {
  await main();
} catch (err) {
  record("runner", "unexpected error", false, err.message);
} finally {
  await runCleanup();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exitCode = failed.length ? 1 : 0;
}
