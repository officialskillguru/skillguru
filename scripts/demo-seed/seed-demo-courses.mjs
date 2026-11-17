/**
 * Idempotent demo-course seeder for SkillGuru.
 *
 *   node scripts/demo-seed/seed-demo-courses.mjs            # seed / reconcile
 *   node scripts/demo-seed/seed-demo-courses.mjs --dry-run  # validate data only
 *   node scripts/demo-seed/seed-demo-courses.mjs --skip-thumbnails
 *
 * Safety rules (do not relax):
 * - Additive only. Never deletes rows. Re-running updates demo rows in place
 *   (matched by slug / sort_order) and never creates duplicates.
 * - Every seeded course is tagged with the `demo-content` tag. A course whose
 *   slug already exists WITHOUT that tag is real data and is skipped untouched.
 * - Demo instructors are real auth users (courses.mentor_id is NOT NULL and
 *   references mentor_profiles) but are banned from signing in, unverified,
 *   and carry an explicit "demo profile" disclaimer in their headline and bio.
 * - No enrollments, payments, reviews or testimonials are created.
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (service
 * role is needed to create the demo instructor accounts). Never run this from
 * the browser and never commit the service-role key.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import { CATEGORY_GROUPS, CATEGORIES, DEMO_TAG, INSTRUCTORS } from "./catalog.mjs";
import { loadCourses, validateCourses } from "./courses.mjs";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(here, "..", "..", ".env"), quiet: true });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_THUMBS = args.has("--skip-thumbnails");

const courses = loadCourses();
const problems = validateCourses(courses);
if (problems.length) {
  console.error("Course data failed validation:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`Validated ${courses.length} demo courses.`);
if (DRY_RUN) process.exit(0);

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
// Retry transient network failures (the seeder makes thousands of small
// requests; a single dropped connection must not abort the run). Only network
// errors and 5xx/429 responses are retried — 4xx errors surface immediately.
async function retryingFetch(input, init, attempt = 1) {
  try {
    const res = await fetch(input, init);
    if ((res.status >= 500 || res.status === 429) && attempt < 5) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (attempt >= 5) throw err;
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return retryingFetch(input, init, attempt + 1);
  }
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: retryingFetch } });

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

// ---------------------------------------------------------------- categories
async function ensureCategory({ slug, name, description, icon, parentId, sortOrder }) {
  const existing = must(await sb.from("categories").select("id, parent_id, deleted_at").eq("slug", slug).maybeSingle(), `lookup category ${slug}`);
  if (existing) {
    if (existing.deleted_at) throw new Error(`Category slug '${slug}' exists but is soft-deleted; resolve manually.`);
    return existing.id;
  }
  const row = must(
    await sb.from("categories").insert({ slug, name, description, icon, parent_id: parentId ?? null, sort_order: sortOrder, status: "active" }).select("id").single(),
    `insert category ${slug}`,
  );
  // The taxonomy-governance trigger forces non-admin inserts to 'pending'
  // (hidden from the public). These categories are part of the approved demo
  // catalogue, so activate them explicitly.
  must(await sb.from("categories").update({ status: "active" }).eq("id", row.id), `activate category ${slug}`);
  console.log(`  + category ${slug}`);
  return row.id;
}

async function ensureCategories() {
  const ids = {};
  for (const [i, group] of CATEGORY_GROUPS.entries()) {
    ids[group.slug] = await ensureCategory({ ...group, sortOrder: 100 + i });
  }
  for (const [i, cat] of CATEGORIES.entries()) {
    ids[cat.slug] = await ensureCategory({ ...cat, parentId: ids[cat.group], sortOrder: i });
  }
  return ids;
}

// ---------------------------------------------------------------- tags
async function ensureTag(name, slug) {
  const existing = must(await sb.from("tags").select("id").eq("slug", slug).maybeSingle(), `lookup tag ${slug}`);
  if (existing) return existing.id;
  return must(await sb.from("tags").insert({ name, slug }).select("id").single(), `insert tag ${slug}`).id;
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------- instructors
async function roleId(code) {
  return must(await sb.from("roles").select("id").eq("code", code).single(), `role ${code}`).id;
}

async function ensureInstructor(inst, mentorRoleId, studentRoleId) {
  const email = inst.email;
  let profile = must(await sb.from("profiles").select("id").eq("email", email).maybeSingle(), `lookup ${email}`);
  let userId = profile?.id;

  if (!userId) {
    // Random password that is never stored or printed; the account is banned
    // below so it can never be used to sign in anyway.
    const created = await sb.auth.admin.createUser({
      email,
      password: randomBytes(24).toString("base64url") + "!a1",
      email_confirm: true,
      user_metadata: { full_name: inst.name, role: "mentor", demo_account: true },
    });
    if (created.error) throw new Error(`create instructor ${email}: ${created.error.message}`);
    userId = created.data.user.id;
    console.log(`  + demo instructor ${email}`);
  }

  // Banned: demo instructors exist only to own demo courses.
  const ban = await sb.auth.admin.updateUserById(userId, { ban_duration: "876000h", user_metadata: { full_name: inst.name, role: "mentor", demo_account: true } });
  if (ban.error) throw new Error(`ban instructor ${email}: ${ban.error.message}`);

  must(await sb.from("profiles").update({ full_name: inst.name, bio: inst.bio, city: inst.city, country: "India", metadata: { demo_account: true } }).eq("id", userId), `profile ${email}`);
  must(
    await sb.from("mentor_profiles").upsert(
      {
        id: userId,
        headline: inst.headline,
        bio: inst.bio,
        expertise: inst.expertise,
        skills: inst.expertise,
        years_of_experience: inst.years,
        experience_years: inst.years,
        is_verified: false,
        status: "active",
        login_disabled: true,
      },
      { onConflict: "id" },
    ),
    `mentor_profile ${email}`,
  );
  must(await sb.from("user_roles").upsert({ user_id: userId, role_id: mentorRoleId, revoked_at: null }, { onConflict: "user_id,role_id" }), `mentor role ${email}`);
  // handle_new_user grants 'student' by default; staff accounts must not hold it.
  must(await sb.from("user_roles").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("role_id", studentRoleId).is("revoked_at", null), `revoke student ${email}`);
  return userId;
}

// ---------------------------------------------------------------- thumbnails
async function renderThumbnails(list) {
  const outDir = join(here, ".thumbs");
  mkdirSync(outDir, { recursive: true });
  const todo = list.filter((c) => !existsSync(join(outDir, `${c.s}.png`)));
  if (todo.length) {
    const { chromium } = await import("@playwright/test");
    const { thumbnailHtml } = await import("./thumbnail-template.mjs");
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const c of todo) {
      await page.setContent(thumbnailHtml(c), { waitUntil: "load" });
      await page.screenshot({ path: join(outDir, `${c.s}.png`), type: "png" });
    }
    await browser.close();
    console.log(`  rendered ${todo.length} thumbnails`);
  }
  return outDir;
}

async function ensureThumbnail(course, courseId, ownerId, thumbDir) {
  const objectKey = `${courseId}/thumbnail.png`;
  const bytes = readFileSync(join(thumbDir, `${course.s}.png`));
  must(await sb.storage.from("courses").upload(objectKey, bytes, { contentType: "image/png", upsert: true }), `upload thumbnail ${course.s}`);
  let file = must(await sb.from("files").select("id").eq("bucket", "courses").eq("storage_path", objectKey).maybeSingle(), `lookup file ${course.s}`);
  const fileRow = {
    original_name: `${course.s}.png`,
    stored_name: "thumbnail.png",
    mime_type: "image/png",
    size_bytes: bytes.length,
    bucket: "courses",
    object_key: objectKey,
    storage_path: objectKey,
    is_public: false,
    virus_scan_status: "skipped",
    uploaded_by: ownerId,
  };
  if (file) must(await sb.from("files").update(fileRow).eq("id", file.id), `update file ${course.s}`);
  else file = must(await sb.from("files").insert(fileRow).select("id").single(), `insert file ${course.s}`);
  return file.id;
}

// ---------------------------------------------------------------- curriculum
function lessonMarkdown(course, moduleTitle, lessonTitle, index) {
  const skills = course.sk.slice(index % course.sk.length).concat(course.sk).slice(0, 3);
  return [
    `## ${lessonTitle}`,
    "",
    `This lesson is part of **${moduleTitle}** in *${course.t}*. It explains the core ideas behind ${lessonTitle.toLowerCase()}, walks through a worked example, and closes with a short practice task you can complete on your own.`,
    "",
    "### What you will cover",
    `- The key concepts behind ${lessonTitle.toLowerCase()} and why they matter in practice`,
    `- How this connects to ${skills.join(", ")}`,
    "- Common mistakes and how to avoid them",
    "",
    "### Practice task",
    `Apply what you learned to a small, realistic scenario and note one question to raise with your mentor.`,
    "",
    "> Demo content: this lesson text was generated for platform demonstration purposes.",
  ].join("\n");
}

async function ensureCurriculum(course, courseId) {
  let lessonCount = 0;
  for (const [mIndex, [moduleTitle, lessons]] of course.m.entries()) {
    const description = `Module ${mIndex + 1} of ${course.m.length}: ${lessons.join(", ")}.`;
    let mod = must(await sb.from("modules").select("id").eq("course_id", courseId).eq("sort_order", mIndex).is("deleted_at", null).maybeSingle(), "lookup module");
    if (mod) must(await sb.from("modules").update({ title: moduleTitle, description }).eq("id", mod.id), "update module");
    else mod = must(await sb.from("modules").insert({ course_id: courseId, title: moduleTitle, description, sort_order: mIndex }).select("id").single(), "insert module");

    for (const [lIndex, lessonTitle] of lessons.entries()) {
      const row = {
        title: lessonTitle,
        content_type: "text",
        text_content: lessonMarkdown(course, moduleTitle, lessonTitle, lIndex),
        duration_seconds: 600 + ((mIndex * 7 + lIndex * 13 + course.s.length) % 10) * 120,
        is_free_preview: mIndex === 0 && lIndex === 0,
      };
      const existing = must(await sb.from("lessons").select("id").eq("module_id", mod.id).eq("sort_order", lIndex).is("deleted_at", null).maybeSingle(), "lookup lesson");
      if (existing) must(await sb.from("lessons").update(row).eq("id", existing.id), "update lesson");
      else must(await sb.from("lessons").insert({ ...row, module_id: mod.id, sort_order: lIndex }), "insert lesson");
      lessonCount++;
    }
  }
  return lessonCount;
}

// ---------------------------------------------------------------- main
async function main() {
  console.log("Ensuring categories...");
  const categoryIds = await ensureCategories();
  const demoTagId = await ensureTag(DEMO_TAG.name, DEMO_TAG.slug);

  console.log("Ensuring demo instructors...");
  const mentorRoleId = await roleId("mentor");
  const studentRoleId = await roleId("student");
  const instructorIds = {};
  for (const inst of INSTRUCTORS) instructorIds[inst.category] = await ensureInstructor(inst, mentorRoleId, studentRoleId);

  const thumbDir = SKIP_THUMBS ? null : await renderThumbnails(courses);

  console.log("Seeding courses...");
  const now = Date.now();
  let created = 0, updated = 0, skipped = 0, lessons = 0;
  for (const [i, c] of courses.entries()) {
    const mentorId = instructorIds[c.category];
    const payload = {
      title: c.t,
      slug: c.s,
      short_description: c.sd,
      description: c.de,
      level: c.l,
      duration: c.d,
      price: c.p,
      language: "English",
      what_you_will_learn: c.o,
      requirements: c.r,
      course_type: /^(8|9|1\d) weeks/.test(c.d) ? "Career Track" : "Self-paced",
      status: "published",
      mentor_id: mentorId,
    };

    const existing = must(await sb.from("courses").select("id, course_tags(tag_id)").eq("slug", c.s).maybeSingle(), `lookup course ${c.s}`);
    let courseId;
    if (existing) {
      const isDemo = (existing.course_tags ?? []).some((t) => t.tag_id === demoTagId);
      if (!isDemo) {
        console.warn(`  ! skipping '${c.s}': slug belongs to a non-demo course`);
        skipped++;
        continue;
      }
      must(await sb.from("courses").update(payload).eq("id", existing.id), `update course ${c.s}`);
      courseId = existing.id;
      updated++;
    } else {
      // Stagger creation dates across ~4 months so "Newest" sorting is meaningful.
      const createdAt = new Date(now - (courses.length - i) * 29 * 3600 * 1000).toISOString();
      courseId = must(await sb.from("courses").insert({ ...payload, created_at: createdAt }).select("id").single(), `insert course ${c.s}`).id;
      created++;
    }

    must(await sb.from("course_tags").upsert({ course_id: courseId, tag_id: demoTagId }, { onConflict: "course_id,tag_id" }), "demo tag");
    for (const skill of c.sk) {
      const tagId = await ensureTag(skill, slugify(skill));
      must(await sb.from("course_tags").upsert({ course_id: courseId, tag_id: tagId }, { onConflict: "course_id,tag_id" }), "skill tag");
    }
    must(await sb.from("course_categories").upsert({ course_id: courseId, category_id: categoryIds[c.category] }, { onConflict: "course_id,category_id" }), "course category");

    const link = must(await sb.from("course_mentors").select("id").eq("course_id", courseId).eq("mentor_id", mentorId).maybeSingle(), "lookup course_mentor");
    if (!link) must(await sb.from("course_mentors").insert({ course_id: courseId, mentor_id: mentorId, is_primary: true, status: "active" }), "course_mentor");

    lessons += await ensureCurriculum(c, courseId);

    if (thumbDir) {
      const fileId = await ensureThumbnail(c, courseId, mentorId, thumbDir);
      must(await sb.from("courses").update({ thumbnail_file_id: fileId }).eq("id", courseId), `set thumbnail ${c.s}`);
    }
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${courses.length}`);
  }

  const { count } = await sb.from("course_tags").select("course_id", { count: "exact", head: true }).eq("tag_id", demoTagId);
  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped} lessons=${lessons}. Demo-tagged courses in DB: ${count}`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
