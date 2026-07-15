/* eslint-disable */
 
/* eslint-env node */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import assert from "assert";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("=== Learning Domain E2E Verification ===");

  // 1. Get or Create Mentor
  let { data: mentorRole } = await adminClient.from("roles").select("id").eq("code", "mentor").single();
  let mentorEmail = `mentor.${Date.now()}@example.com`;
  let { data: mentorAuth } = await adminClient.auth.admin.createUser({ email: mentorEmail, password: "Password123!", email_confirm: true });
  await new Promise(r => setTimeout(r, 1000));
  await adminClient.from("user_roles").insert({ user_id: mentorAuth.user.id, role_id: mentorRole.id });
  const mentorId = mentorAuth.user.id;
  const { error: mpErr } = await adminClient.from("mentor_profiles").insert({ id: mentorId, headline: "Expert", bio: "Test Bio" });
  if (mpErr) console.error("Mentor Profile Error:", mpErr);
  console.log("1. Created Mentor:", mentorId);
  // 2. Get or Create Student
  let studentEmail = `student.${Date.now()}@example.com`;
  let { data: studentAuth } = await adminClient.auth.admin.createUser({ email: studentEmail, password: "Password123!", email_confirm: true });
  await new Promise(r => setTimeout(r, 1000));
  const studentId = studentAuth.user.id;
  console.log("2. Created Student:", studentId);

  // 3. Mentor creates Category, Course, Module, Lesson
  const { data: category, error: catErr } = await adminClient.from("categories").insert({ name: "Testing", slug: `test-${Date.now()}` }).select().single();
  if (catErr) console.error("Category Error:", catErr);
  const { data: course, error: crsErr } = await adminClient.from("courses").insert({ title: "E2E Course", slug: `e2e-course-${Date.now()}`, mentor_id: mentorId, status: "published" }).select().single();
  if (crsErr) console.error("Course Error:", crsErr);
  await adminClient.from("course_categories").insert({ course_id: course.id, category_id: category.id });
  const { data: module, error: modErr } = await adminClient.from("modules").insert({ course_id: course.id, title: "Module 1" }).select().single();
  if (modErr) console.error("Module Error:", modErr);
  const { data: lesson1, error: l1Err } = await adminClient.from("lessons").insert({ module_id: module.id, title: "Lesson 1", content_type: "video" }).select().single();
  const { data: lesson2 } = await adminClient.from("lessons").insert({ module_id: module.id, title: "Lesson 2", content_type: "text" }).select().single();
  console.log("3. Created Course content (2 lessons). Course ID:", course.id);

  // 4. Student Enrolls (Simulating EnrollmentService)
  const { data: enrollment } = await adminClient.from("enrollments").insert({
    student_id: studentId, course_id: course.id, enrollment_source: "manual"
  }).select().single();
  console.log("4. Student Enrolled. Enrollment ID:", enrollment.id);

  // 5. Complete Lesson 1
  await adminClient.from("lesson_progress").insert({
    enrollment_id: enrollment.id, lesson_id: lesson1.id, status: "completed"
  });
  console.log("5. Completed Lesson 1.");

  // Wait for DB trigger
  await new Promise(r => setTimeout(r, 500));
  const { data: progress } = await adminClient.from("course_progress").select("*").eq("enrollment_id", enrollment.id).single();
  console.log("Course Progress Recalculated:", progress.completion_percentage, "% (", progress.completed_lessons, "/", progress.total_lessons, ")");
  assert.strictEqual(Number(progress.completion_percentage), 50.00, "Progress should be 50%");

  // 6. Complete Lesson 2 -> 100%
  await adminClient.from("lesson_progress").insert({
    enrollment_id: enrollment.id, lesson_id: lesson2.id, status: "completed"
  });
  await new Promise(r => setTimeout(r, 500));
  const { data: progress2 } = await adminClient.from("course_progress").select("*").eq("enrollment_id", enrollment.id).single();
  console.log("Course Progress Recalculated:", progress2.completion_percentage, "%");
  assert.strictEqual(Number(progress2.completion_percentage), 100.00, "Progress should be 100%");

  // 7. Generate Quiz & Attempt
  const { data: quiz } = await adminClient.from("quizzes").insert({ course_id: course.id, title: "Final Exam", is_published: true }).select().single();
  const { data: q1 } = await adminClient.from("quiz_questions").insert({ quiz_id: quiz.id, question_text: "Is this cool?" }).select().single();
  const { data: opt1 } = await adminClient.from("quiz_options").insert({ question_id: q1.id, option_text: "Yes", is_correct: true }).select().single();

  const { data: attempt } = await adminClient.from("quiz_attempts").insert({ enrollment_id: enrollment.id, quiz_id: quiz.id, passed: true, score: 100 }).select().single();
  await adminClient.from("quiz_answers").insert({ attempt_id: attempt.id, question_id: q1.id, selected_option_id: opt1.id, is_correct: true });
  console.log("7. Quiz Attempted and Passed. Attempt ID:", attempt.id);

  // 8. Generate Certificate
  const { data: cert } = await adminClient.from("certificates").insert({
    enrollment_id: enrollment.id, certificate_number: `SG-${Date.now()}`, verification_code: Math.random().toString(36).substring(2, 15)
  }).select().single();
  console.log("8. Certificate Generated:", cert.certificate_number);

  // 9. Cascade Delete Test
  const { error: delCourseErr } = await adminClient.from("courses").delete().eq("id", course.id);
  if (delCourseErr) console.error("Delete Course Error:", delCourseErr);
  console.log("9. Deleted Course.");

  const { data: checkEnrollment } = await adminClient.from("enrollments").select("id").eq("id", enrollment.id);
  assert.strictEqual(checkEnrollment.length, 0, "Enrollment should be cascaded.");
  const { data: checkCert } = await adminClient.from("certificates").select("id").eq("id", cert.id);
  assert.strictEqual(checkCert.length, 0, "Certificate should be cascaded.");

  // Cleanup Users
  await adminClient.auth.admin.deleteUser(studentId);
  await adminClient.auth.admin.deleteUser(mentorId);
  console.log("10. Cleanup Successful.");

  console.log("=== ALL TESTS PASSED ===");
}

run().catch(console.error);
