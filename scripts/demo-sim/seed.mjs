/**
 * End-to-end simulation seed for SkillGuru (counsellor -> student -> teacher).
 *
 *   npm run demo:seed            # create / refresh the simulation data
 *   npm run demo:reset           # delete the simulation data, then seed again
 *   node scripts/demo-sim/seed.mjs --check   # only verify the target, change nothing
 *
 * TARGET SAFETY (do not relax):
 * - Reads connection details from the LOCAL Supabase stack (`supabase status`),
 *   never from .env, so it cannot pick up production credentials by accident.
 * - Refuses to run unless the API URL is localhost/127.0.0.1. There is no flag
 *   to point it at a hosted project.
 * - Only ever deletes rows it can attribute to the simulation: users whose email
 *   ends in @demo.skillguru.local, and courses owned by those demo teachers.
 *
 * Writes `.env.demo.local` (git-ignored) so `npm run dev:demo` talks to the same
 * local stack. All people, courses, prices and payments are fictional.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pgPkg from "pg";

import { SIM_DOMAIN, ACCOUNTS, COURSES, SESSIONS } from "./data.mjs";

const { Client } = pgPkg;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const args = new Set(process.argv.slice(2));
const RESET = args.has("--reset");
const CHECK_ONLY = args.has("--check");

// ─────────────────────────────────────────────────────────────── target check
function readLocalStatus() {
  let raw;
  try {
    raw = execFileSync(process.platform === "win32" ? "npx supabase status -o json" : "npx", process.platform === "win32" ? [] : ["supabase", "status", "-o", "json"], { cwd: root, encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    console.error("Local Supabase is not running. Start it with `npx supabase start` (Docker required).");
    process.exit(1);
  }
  const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return { url: json.API_URL, anonKey: json.ANON_KEY, serviceKey: json.SERVICE_ROLE_KEY, dbUrl: json.DB_URL };
}

const target = readLocalStatus();
const host = new URL(target.url).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`Refusing to run: target ${target.url} is not a local Supabase stack.`);
  process.exit(1);
}
console.log(`Target verified: local Supabase at ${target.url}`);

if (!["127.0.0.1", "localhost"].includes(new URL(target.dbUrl).hostname)) {
  console.error("Refusing to run: database URL is not local.");
  process.exit(1);
}

if (!CHECK_ONLY) {
  // Local-only grant bootstrap (see local-grants.sql for why it is needed).
  const pg = new Client({ connectionString: target.dbUrl });
  await pg.connect();
  await pg.query(readFileSync(join(here, "local-grants.sql"), "utf8"));

  // Functions: the hosted project granted EXECUTE to anon/authenticated/service_role
  // by default and migrations then REVOKE where needed. Re-create that end state:
  // grant to each role unless some migration revokes that function from that role.
  const revoked = { anon: new Set(), authenticated: new Set() };
  const migrationsDir = join(root, "supabase", "migrations");
  const { readdirSync } = await import("node:fs");
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    for (const m of sql.matchAll(/revoke\s+(?:all|execute)\s+on\s+function\s+public\.(\w+)\s*\([^)]*\)\s+from\s+([^;]+);/gi)) {
      const roles = m[2].toLowerCase().split(",").map((r) => r.trim());
      // anon loses access when revoked from anon or PUBLIC; authenticated only when named
      // explicitly (those migrations re-grant authenticated after revoking PUBLIC).
      if (roles.includes("anon") || roles.includes("public")) revoked.anon.add(m[1].toLowerCase());
      if (roles.includes("authenticated")) revoked.authenticated.add(m[1].toLowerCase());
    }
  }
  const { rows: fns } = await pg.query(`
    select p.oid::regprocedure::text as sig, p.proname as name
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')`);
  for (const fn of fns) {
    const grantees = ["service_role"];
    if (!revoked.authenticated.has(fn.name)) grantees.push("authenticated");
    if (!revoked.anon.has(fn.name)) grantees.push("anon");
    await pg.query(`grant execute on function ${fn.sig} to ${grantees.join(", ")}`);
  }
  await pg.end();
}

const sb = createClient(target.url, target.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

{
  // A local stack that has not been migrated is not a valid target either.
  const probe = await sb.from("live_classes").select("id, started_at").limit(1);
  if (probe.error) {
    console.error(`Local database is missing the simulation migration (${probe.error.message}). Run \`npx supabase db reset\` or apply supabase/migrations first.`);
    process.exit(1);
  }
}
if (CHECK_ONLY) {
  console.log("Check only: target is local and migrated. No changes made.");
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────── env + password
const envPath = join(root, ".env.demo.local");
function readExistingPassword() {
  if (process.env.DEMO_SIM_PASSWORD) return process.env.DEMO_SIM_PASSWORD;
  if (!existsSync(envPath)) return null;
  const match = readFileSync(envPath, "utf8").match(/^DEMO_SIM_PASSWORD=(.+)$/m);
  return match ? match[1].trim() : null;
}
const password = readExistingPassword() ?? `Sim-${randomBytes(9).toString("base64url")}-7a`;

writeFileSync(
  envPath,
  [
    "# Generated by scripts/demo-sim/seed.mjs - local simulation only. Git-ignored; never commit.",
    `VITE_SUPABASE_URL=${target.url}`,
    `VITE_SUPABASE_ANON_KEY=${target.anonKey}`,
    "VITE_SITE_URL=http://localhost:5173",
    "VITE_DEMO_SIMULATION=true",
    "VITE_RESUME_BUILDER_V2=true",
    `DEMO_SIM_PASSWORD=${password}`,
    "",
  ].join("\n"),
);
const fnEnvPath = join(root, "supabase", "functions", ".env.demo.local");
if (!existsSync(fnEnvPath) || !/MOCK_PAYMENT_SECRET=/.test(readFileSync(fnEnvPath, "utf8"))) {
  // Kept stable across runs so an already-running `npm run demo:functions` keeps working.
  writeFileSync(fnEnvPath, ["# Local simulation Edge Function env. Git-ignored.", "PAYMENT_PROVIDER=mock", `MOCK_PAYMENT_SECRET=sim-${randomBytes(12).toString("hex")}`, ""].join("\n"));
}

// ─────────────────────────────────────────────────────────────── dates (IST)
function istParts(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60_000 + 330 * 60_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}
function istDate(dayOffset) {
  return istParts(dayOffset * 24 * 60).date;
}
/** HH:MM rounded up to the next 15 minutes, `minutesFromNow` ahead (IST), clamped before 23:00. */
function istTime(minutesFromNow) {
  const { time } = istParts(minutesFromNow);
  let [h, m] = time.split(":").map(Number);
  m = Math.ceil(m / 15) * 15;
  if (m === 60) { h += 1; m = 0; }
  if (h >= 23) { h = 22; m = 0; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────── reset
async function listSimUsers() {
  const ids = {};
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`list users: ${error.message}`);
    for (const u of data.users) if (u.email?.endsWith(`@${SIM_DOMAIN}`)) ids[u.email] = u.id;
    if (data.users.length < 200) break;
    page++;
  }
  return ids;
}

async function reset() {
  const users = await listSimUsers();
  const userIds = Object.values(users);
  if (userIds.length === 0) {
    console.log("Reset: no simulation users found, nothing to delete.");
    return;
  }
  const teacherIds = ACCOUNTS.filter((a) => a.role === "mentor").map((a) => users[a.email]).filter(Boolean);
  const courses = teacherIds.length ? must(await sb.from("courses").select("id").in("mentor_id", teacherIds), "list sim courses") : [];
  const courseIds = courses.map((c) => c.id);

  const orders = must(await sb.from("orders").select("id").in("user_id", userIds), "list sim orders");
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length) {
    for (const table of ["invoices", "payment_logs", "refunds", "payments", "order_items"]) {
      must(await sb.from(table).delete().in("order_id", orderIds), `delete ${table}`);
    }
    must(await sb.from("orders").delete().in("id", orderIds), "delete orders");
  }
  must(await sb.from("notifications").delete().in("recipient_id", userIds), "delete notifications");
  must(await sb.from("attendance").delete().in("student_id", userIds), "delete attendance");
  must(await sb.from("enrollments").delete().in("student_id", userIds), "delete enrollments");

  if (courseIds.length) {
    must(await sb.from("enrollments").delete().in("course_id", courseIds), "delete course enrollments");
    must(await sb.from("live_classes").delete().in("course_id", courseIds), "delete live classes");
    for (const table of ["course_mentors", "course_categories", "course_tags", "course_faqs", "course_media"]) {
      must(await sb.from(table).delete().in("course_id", courseIds), `delete ${table}`);
    }
    const modules = must(await sb.from("modules").select("id").in("course_id", courseIds), "list modules");
    if (modules.length) {
      must(await sb.from("lessons").delete().in("module_id", modules.map((m) => m.id)), "delete lessons");
      must(await sb.from("modules").delete().in("course_id", courseIds), "delete modules");
    }
    must(await sb.from("courses").update({ thumbnail_file_id: null }).in("id", courseIds), "clear thumbnails");
    must(await sb.from("courses").delete().in("id", courseIds), "delete courses");
    const objects = courseIds.map((id) => `${id}/thumbnail.png`);
    await sb.storage.from("courses").remove(objects);
    must(await sb.from("files").delete().in("storage_path", objects), "delete thumbnail files");
  }
  console.log(`Reset: removed simulation data for ${userIds.length} users and ${courseIds.length} courses.`);
}

// ─────────────────────────────────────────────────────────────── accounts
async function roleId(code) {
  return must(await sb.from("roles").select("id").eq("code", code).single(), `role ${code}`).id;
}

async function ensureAccount(account, roleIds) {
  const existing = (await listSimUsers())[account.email];
  let userId = existing;
  const metadata = { full_name: account.name, role: account.role, demo_simulation: true };
  if (!userId) {
    const created = await sb.auth.admin.createUser({ email: account.email, password, email_confirm: true, user_metadata: metadata });
    if (created.error) throw new Error(`create ${account.email}: ${created.error.message}`);
    userId = created.data.user.id;
  } else {
    must(await sb.auth.admin.updateUserById(userId, { password, user_metadata: metadata, ban_duration: "none" }), `update ${account.email}`);
  }

  must(
    await sb.from("profiles").update({
      full_name: account.name,
      phone: account.phone ?? null,
      city: account.city ?? null,
      state: account.state ?? null,
      country: "India",
      bio: account.bio ?? null,
      metadata: { demo_simulation: true, onboarding_completed: true },
      profile_completion_pct: 100,
    }).eq("id", userId),
    `profile ${account.email}`,
  );

  if (account.role === "student") {
    must(await sb.from("student_profiles").upsert({ id: userId }, { onConflict: "id" }), `student_profile ${account.email}`);
  }

  if (account.role !== "student") {
    must(await sb.from("user_roles").upsert({ user_id: userId, role_id: roleIds[account.role], revoked_at: null }, { onConflict: "user_id,role_id" }), `role ${account.email}`);
    must(await sb.from("user_roles").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("role_id", roleIds.student).is("revoked_at", null), `revoke student ${account.email}`);
  }

  if (account.role === "mentor") {
    must(
      await sb.from("mentor_profiles").upsert(
        {
          id: userId,
          headline: account.headline,
          bio: account.bio,
          expertise: account.expertise,
          skills: account.expertise,
          years_of_experience: account.years,
          experience_years: account.years,
          is_verified: true,
          status: "active",
          login_disabled: false,
        },
        { onConflict: "id" },
      ),
      `mentor_profile ${account.email}`,
    );
  }
  return userId;
}

// ─────────────────────────────────────────────────────────────── courses
async function ensureCategory(slug, name) {
  let row = must(await sb.from("categories").select("id, status").eq("slug", slug).is("deleted_at", null).maybeSingle(), `category ${slug}`);
  if (!row) row = must(await sb.from("categories").insert({ slug, name, status: "active" }).select("id, status").single(), `insert category ${slug}`);
  if (row.status !== "active") must(await sb.from("categories").update({ status: "active" }).eq("id", row.id), `activate category ${slug}`);
  return row.id;
}

async function ensureTag(name, slug) {
  const existing = must(await sb.from("tags").select("id").eq("slug", slug).maybeSingle(), `tag ${slug}`);
  if (existing) return existing.id;
  return must(await sb.from("tags").insert({ name, slug }).select("id").single(), `insert tag ${slug}`).id;
}

let browser = null;
async function renderThumbnail(course) {
  const outDir = join(here, ".thumbs");
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${course.slug}.png`);
  if (existsSync(file)) return readFileSync(file);
  try {
    if (!browser) {
      const { chromium } = await import("@playwright/test");
      browser = await chromium.launch();
    }
    const { thumbnailHtml } = await import("../demo-seed/thumbnail-template.mjs");
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(thumbnailHtml({ t: course.title, d: course.duration, l: course.level, category: course.theme }), { waitUntil: "load" });
    await page.screenshot({ path: file });
    await page.close();
    return readFileSync(file);
  } catch (err) {
    console.warn(`  ! thumbnail render failed for ${course.slug} (${err.message}); course will have no cover image.`);
    return null;
  }
}

async function ensureThumbnail(course, courseId, ownerId) {
  const bytes = await renderThumbnail(course);
  if (!bytes) return null;
  const objectKey = `${courseId}/thumbnail.png`;
  must(await sb.storage.from("courses").upload(objectKey, bytes, { contentType: "image/png", upsert: true }), `upload thumbnail ${course.slug}`);
  const fileRow = {
    original_name: `${course.slug}.png`, stored_name: "thumbnail.png", mime_type: "image/png", size_bytes: bytes.length,
    bucket: "courses", object_key: objectKey, storage_path: objectKey, is_public: false, virus_scan_status: "skipped", uploaded_by: ownerId,
  };
  const existing = must(await sb.from("files").select("id").eq("bucket", "courses").eq("storage_path", objectKey).maybeSingle(), "lookup file");
  if (existing) {
    must(await sb.from("files").update(fileRow).eq("id", existing.id), "update file");
    return existing.id;
  }
  return must(await sb.from("files").insert(fileRow).select("id").single(), "insert file").id;
}

async function ensureCourse(course, mentorId, simTagId) {
  const categoryId = await ensureCategory(course.categorySlug, course.categoryName);
  const payload = {
    title: course.title, slug: course.slug, short_description: course.shortDescription, description: course.description,
    level: course.level, duration: course.duration, price: course.price, language: "English",
    what_you_will_learn: course.outcomes, requirements: course.requirements, course_type: course.courseType,
    status: course.status, mentor_id: mentorId,
  };
  const existing = must(await sb.from("courses").select("id").eq("slug", course.slug).maybeSingle(), `lookup ${course.slug}`);
  const courseId = existing
    ? (must(await sb.from("courses").update(payload).eq("id", existing.id), `update ${course.slug}`), existing.id)
    : must(await sb.from("courses").insert(payload).select("id").single(), `insert ${course.slug}`).id;

  must(await sb.from("course_tags").upsert({ course_id: courseId, tag_id: simTagId }, { onConflict: "course_id,tag_id" }), "sim tag");
  must(await sb.from("course_categories").delete().eq("course_id", courseId), "clear categories");
  must(await sb.from("course_categories").insert({ course_id: courseId, category_id: categoryId }), "course category");
  must(await sb.from("course_mentors").delete().eq("course_id", courseId), "clear mentors");
  must(await sb.from("course_mentors").insert({ course_id: courseId, mentor_id: mentorId, is_primary: true, status: "active" }), "course mentor");

  const oldModules = must(await sb.from("modules").select("id").eq("course_id", courseId), "list modules");
  if (oldModules.length) {
    must(await sb.from("lessons").delete().in("module_id", oldModules.map((m) => m.id)), "clear lessons");
    must(await sb.from("modules").delete().eq("course_id", courseId), "clear modules");
  }
  for (const [mIndex, mod] of course.syllabus.entries()) {
    const moduleId = must(await sb.from("modules").insert({ course_id: courseId, title: mod.title, description: mod.summary, sort_order: mIndex }).select("id").single(), "insert module").id;
    for (const [lIndex, lesson] of mod.lessons.entries()) {
      must(
        await sb.from("lessons").insert({
          module_id: moduleId, sort_order: lIndex, title: lesson, content_type: "text",
          text_content: `## ${lesson}\n\n${mod.summary}\n\n### In this lesson\n- Core ideas behind ${lesson.toLowerCase()}\n- A worked example you can follow along with\n- A short practice task to check your understanding\n\n_Simulation content - fictional course material._`,
          duration_seconds: 900 + ((mIndex * 5 + lIndex * 3) % 6) * 180,
          is_free_preview: mIndex === 0 && lIndex === 0,
        }),
        "insert lesson",
      );
    }
  }

  const fileId = await ensureThumbnail(course, courseId, mentorId);
  if (fileId) must(await sb.from("courses").update({ thumbnail_file_id: fileId }).eq("id", courseId), "set thumbnail");
  return courseId;
}

// ─────────────────────────────────────────────────────────────── purchases + classes
async function seedCompletedPurchase(studentId, courseId, price, method) {
  const order = must(await sb.from("orders").insert({ user_id: studentId, total_amount: price, currency: "INR", status: "pending", razorpay_order_id: `mock_order_seed_${randomBytes(6).toString("hex")}` }).select("id").single(), "seed order");
  must(await sb.from("order_items").insert({ order_id: order.id, course_id: courseId, price }), "seed order item");
  return must(
    await sb.rpc("complete_paid_order", { p_order_id: order.id, p_provider: "mock", p_provider_payment_id: `mock_pay_seed_${randomBytes(6).toString("hex")}`, p_signature: null, p_method: method, p_source: "seed" }),
    "complete seed order",
  );
}

async function seedSessions(courseIds, userIds) {
  const created = [];
  for (const s of SESSIONS) {
    const start = s.dayOffset === 0 ? istTime(s.startInMinutes) : s.time;
    const row = {
      course_id: courseIds[s.course], mentor_id: userIds[s.teacher], created_by: userIds[s.createdBy ?? s.teacher],
      title: s.title, description: s.description, scheduled_date: istDate(s.dayOffset),
      start_time: start, end_time: addMinutes(start, s.durationMinutes), meeting_platform: "demo", status: s.status, is_demo: true,
      started_at: s.status === "completed" ? new Date(Date.now() + s.dayOffset * 86_400_000).toISOString() : null,
      ended_at: s.status === "completed" ? new Date(Date.now() + s.dayOffset * 86_400_000 + s.durationMinutes * 60_000).toISOString() : null,
    };
    const cls = must(await sb.from("live_classes").insert(row).select("id").single(), `session ${s.title}`);
    created.push({ ...s, id: cls.id, date: row.scheduled_date, start });
    for (const email of s.attendedBy ?? []) {
      must(
        await sb.from("attendance").insert({ student_id: userIds[email], session_type: "live", session_id: cls.id, course_id: courseIds[s.course], status: "present", date: row.scheduled_date, notes: "Joined live class room" }),
        "seed attendance",
      );
    }
  }
  return created;
}

// ─────────────────────────────────────────────────────────────── main
async function main() {
  if (RESET) await reset();

  const roleIds = { student: await roleId("student"), mentor: await roleId("mentor"), counsellor: await roleId("counsellor") };
  const userIds = {};
  for (const account of ACCOUNTS) userIds[account.email] = await ensureAccount(account, roleIds);
  console.log(`Accounts ready: ${ACCOUNTS.length}`);

  // Re-seeding without --reset would duplicate sessions/orders; require a clean slate for those.
  const teacherIds = ACCOUNTS.filter((a) => a.role === "mentor").map((a) => userIds[a.email]);
  const existingCourses = must(await sb.from("courses").select("id").in("mentor_id", teacherIds), "existing sim courses");
  if (existingCourses.length && !RESET) {
    console.log("Simulation data already exists. Run `npm run demo:reset` to restore the documented starting state.");
    printSummary();
    return;
  }

  const simTagId = await ensureTag("Simulation", "demo-simulation");
  const courseIds = {};
  for (const course of COURSES) {
    courseIds[course.key] = await ensureCourse(course, userIds[course.teacher], simTagId);
    console.log(`  course ${course.status.padEnd(9)} ${course.title}`);
  }
  if (browser) await browser.close();

  for (const purchase of ACCOUNTS.flatMap((a) => (a.purchases ?? []).map((p) => ({ ...p, email: a.email })))) {
    const course = COURSES.find((c) => c.key === purchase.course);
    const result = await seedCompletedPurchase(userIds[purchase.email], courseIds[course.key], course.price, purchase.method);
    console.log(`  purchase ${purchase.email} -> ${course.title} (${result.invoiceNumber})`);
  }

  const sessions = await seedSessions(courseIds, userIds);
  for (const s of sessions) console.log(`  class ${s.status.padEnd(9)} ${s.date} ${s.start} IST  ${s.title}`);
  printSummary();
}

function printSummary() {
  console.log("\nSimulation accounts (password is DEMO_SIM_PASSWORD in .env.demo.local):");
  for (const a of ACCOUNTS) console.log(`  ${a.label.padEnd(26)} ${a.email}`);
  console.log("\nNext: `npm run demo:functions` (terminal 1) and `npm run dev:demo` (terminal 2), then open http://localhost:5173");
}

await main();
