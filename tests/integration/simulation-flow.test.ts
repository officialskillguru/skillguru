// @vitest-environment node
// ============================================================================
// End-to-end backend acceptance for the purchase-to-class simulation, run
// against the LOCAL Supabase stack (real Postgres, RLS, Edge Functions):
//
//   SIM_INTEGRATION=1 npx vitest run tests/integration/simulation-flow.test.ts
//
// Prerequisites: `npx supabase start`, `npm run demo:reset`, and
// `npm run demo:functions` running. The suite mutates simulation data, so run
// `npm run demo:reset` afterwards to restore the walkthrough starting state.
// Skipped (not failed) when SIM_INTEGRATION is not set, so `npm test` stays
// hermetic.
// ============================================================================
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const RUN = process.env.SIM_INTEGRATION === "1";
const DOMAIN = "demo.skillguru.local";

type Clients = { url: string; anonKey: string; service: SupabaseClient };

function localTarget(): Clients {
  const raw = execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, string>;
  const url = json.API_URL!;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error(`Refusing non-local target ${url}`);
  return {
    url,
    anonKey: json.ANON_KEY!,
    service: createClient(url, json.SERVICE_ROLE_KEY!, { auth: { persistSession: false } }),
  };
}

function password(): string {
  const match = readFileSync(".env.demo.local", "utf8").match(/^DEMO_SIM_PASSWORD=(.+)$/m);
  if (!match) throw new Error("Run `npm run demo:reset` first (.env.demo.local is missing DEMO_SIM_PASSWORD)");
  return match[1]!.trim();
}

async function signIn(t: Clients, who: string): Promise<{ client: SupabaseClient; userId: string; token: string }> {
  const client = createClient(t.url, t.anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: `${who}@${DOMAIN}`, password: password() });
  if (error || !data.session) throw new Error(`sign in ${who}: ${error?.message}`);
  return { client, userId: data.user.id, token: data.session.access_token };
}

async function callFn(t: Clients, token: string, name: string, body: unknown) {
  const res = await fetch(`${t.url}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: t.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as { success: boolean; message: string; data: any; errors: unknown[] } };
}

const BILLING = { fullName: "Riya Sharma", email: `student.riya@${DOMAIN}`, phone: "9876543210", city: "Pune" };

describe.skipIf(!RUN)("simulation flow (local Supabase)", () => {
  let t: Clients;
  let courseIds: Record<string, string>;
  let riya: Awaited<ReturnType<typeof signIn>>;
  let neha: Awaited<ReturnType<typeof signIn>>;
  let vikram: Awaited<ReturnType<typeof signIn>>;
  let kavya: Awaited<ReturnType<typeof signIn>>;
  let meera: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    t = localTarget();
    const { data } = await t.service.from("courses").select("id, slug").like("slug", "sim-%");
    courseIds = Object.fromEntries((data ?? []).map((c) => [c.slug as string, c.id as string]));
    [riya, neha, vikram, kavya, meera] = await Promise.all(
      ["student.riya", "student.neha", "teacher.vikram", "teacher.kavya", "counsellor.meera"].map((w) => signIn(t, w)),
    );
  }, 60_000);

  async function counts(userId: string, courseId: string) {
    const { data: orders } = await t.service.from("orders").select("id, status, order_items!inner(course_id)").eq("user_id", userId).eq("order_items.course_id", courseId);
    const orderIds = (orders ?? []).map((o) => o.id as string);
    const [{ count: completedPayments }, { count: invoices }, { count: enrollments }] = await Promise.all([
      t.service.from("payments").select("id", { count: "exact", head: true }).in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]).eq("status", "completed"),
      t.service.from("invoices").select("id", { count: "exact", head: true }).in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]),
      t.service.from("enrollments").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("course_id", courseId).eq("status", "active"),
    ]);
    return { orders: orders ?? [], completedPayments, invoices, enrollments };
  }

  it("rejects invalid checkout details with the offending fields", { timeout: 30_000 }, async () => {
    const res = await callFn(t, riya.token, "create-order", {
      courseId: courseIds["sim-python-for-beginners"],
      billing: { fullName: "R", email: "not-an-email", phone: "12345", city: "" },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toEqual(expect.arrayContaining(["fullName", "email", "phone", "city"]));
  });

  it("refuses to sell an unpublished (draft) course", { timeout: 30_000 }, async () => {
    const res = await callFn(t, riya.token, "create-order", { courseId: courseIds["sim-data-analytics-python-power-bi"], billing: BILLING });
    expect(res.status).toBe(400);
  });

  it("a declined payment grants nothing; a retry succeeds; duplicate confirmations stay single", async () => {
    const courseId = courseIds["sim-python-for-beginners"]!;

    const first = await callFn(t, riya.token, "create-order", { courseId, billing: BILLING });
    expect(first.status).toBe(201);
    const declined = await callFn(t, riya.token, "simulate-payment", { orderId: first.json.data.orderId, outcome: "declined", method: "card" });
    expect(declined.json.data.status).toBe("failed");
    let c = await counts(riya.userId, courseId);
    expect(c.enrollments).toBe(0);
    expect(c.completedPayments).toBe(0);

    // A late success for the declined order must not resurrect it.
    const lateVerify = await callFn(t, riya.token, "verify-payment", {
      orderId: first.json.data.orderId,
      providerOrderId: first.json.data.providerOrderId,
      providerPaymentId: first.json.data.mockPayment.providerPaymentId,
      signature: first.json.data.mockPayment.signature,
    });
    expect(lateVerify.status).toBe(409);

    // Lessons stay locked for the declined buyer.
    const { data: lockedLessons } = await riya.client.from("lessons").select("id, is_free_preview, modules!inner(course_id)").eq("modules.course_id", courseId);
    expect((lockedLessons ?? []).every((l) => l.is_free_preview)).toBe(true);

    const retry = await callFn(t, riya.token, "create-order", { courseId, billing: BILLING });
    expect(retry.status).toBe(201);
    expect(retry.json.data.orderId).not.toBe(first.json.data.orderId);
    const verifyBody = {
      orderId: retry.json.data.orderId,
      providerOrderId: retry.json.data.providerOrderId,
      providerPaymentId: retry.json.data.mockPayment.providerPaymentId,
      signature: retry.json.data.mockPayment.signature,
      method: "upi",
    };

    // Double-click + webhook racing: three verify calls and a bank callback at once.
    const results = await Promise.all([
      callFn(t, riya.token, "verify-payment", verifyBody),
      callFn(t, riya.token, "verify-payment", verifyBody),
      callFn(t, riya.token, "verify-payment", verifyBody),
      callFn(t, riya.token, "simulate-payment", { orderId: retry.json.data.orderId, outcome: "confirm" }),
    ]);
    for (const r of results) expect(r.json.success).toBe(true);
    expect(results.filter((r) => r.json.data?.alreadyCompleted === false)).toHaveLength(1);
    const invoiceNumbers = new Set(results.map((r) => r.json.data.invoiceNumber));
    expect(invoiceNumbers.size).toBe(1);

    c = await counts(riya.userId, courseId);
    expect(c.enrollments).toBe(1);
    expect(c.completedPayments).toBe(1);
    expect(c.invoices).toBe(1);
    expect(c.orders.filter((o) => o.status === "completed")).toHaveLength(1);
    expect(c.orders.filter((o) => o.status === "failed")).toHaveLength(1);

    // Already enrolled: a new checkout is refused instead of charging twice.
    const again = await callFn(t, riya.token, "create-order", { courseId, billing: BILLING });
    expect(again.status).toBe(409);

    // Unlocked lessons are now readable through RLS.
    const { data: lessons } = await riya.client.from("lessons").select("id, is_free_preview, modules!inner(course_id)").eq("modules.course_id", courseId);
    expect((lessons ?? []).some((l) => !l.is_free_preview)).toBe(true);
  }, 60_000);

  it("a pending payment stays locked until the bank callback confirms it", async () => {
    const courseId = courseIds["sim-ui-ux-figma-fundamentals"]!;
    const order = await callFn(t, riya.token, "create-order", { courseId, billing: BILLING });
    const pending = await callFn(t, riya.token, "simulate-payment", { orderId: order.json.data.orderId, outcome: "pending", method: "netbanking" });
    expect(pending.json.data.status).toBe("pending");
    expect((await counts(riya.userId, courseId)).enrollments).toBe(0);

    // Resuming checkout reuses the same pending order rather than opening another.
    const resumed = await callFn(t, riya.token, "create-order", { courseId, billing: BILLING });
    expect(resumed.json.data.orderId).toBe(order.json.data.orderId);

    const confirmed = await callFn(t, riya.token, "simulate-payment", { orderId: order.json.data.orderId, outcome: "confirm" });
    expect(confirmed.json.data.alreadyCompleted).toBe(false);
    const c = await counts(riya.userId, courseId);
    expect(c.enrollments).toBe(1);
    expect(c.completedPayments).toBe(1);
  }, 30_000);

  it("a student cannot act on another student's order", { timeout: 30_000 }, async () => {
    const { data: riyaOrder } = await t.service.from("orders").select("id").eq("user_id", riya.userId).limit(1).single();
    const res = await callFn(t, neha.token, "simulate-payment", { orderId: riyaOrder!.id, outcome: "confirm" });
    expect(res.status).toBe(403);
  });

  it("only the course teacher starts/ends a class; only enrolled students join and get attendance", async () => {
    const { data: cls } = await t.service.from("live_classes").select("id").eq("course_id", courseIds["sim-ui-ux-figma-fundamentals"]!).eq("status", "scheduled").limit(1).single();
    const classId = cls!.id as string;

    // Not live yet: enrolled student waits.
    const early = await riya.client.rpc("join_live_class", { p_class_id: classId });
    expect(early.error?.message).toMatch(/class_not_live/);

    // Another course's teacher cannot start it, see its roster, or update it directly.
    expect((await vikram.client.rpc("start_live_class", { p_class_id: classId })).error?.code).toBe("42501");
    expect((await vikram.client.rpc("get_live_class_roster", { p_class_id: classId })).error?.code).toBe("42501");
    const directUpdate = await vikram.client.from("live_classes").update({ status: "live" }).eq("id", classId).select("id");
    expect(directUpdate.data ?? []).toHaveLength(0);
    // A student cannot flip status either.
    const studentUpdate = await riya.client.from("live_classes").update({ status: "live" }).eq("id", classId).select("id");
    expect(studentUpdate.data ?? []).toHaveLength(0);

    const started = await kavya.client.rpc("start_live_class", { p_class_id: classId });
    expect(started.error).toBeNull();
    expect(started.data.status).toBe("live");

    // Students were notified, and the enrolled student can now join.
    const { data: liveNote } = await riya.client.from("notifications").select("id").eq("type", "live_class").eq("title", "Class is live now");
    expect((liveNote ?? []).length).toBeGreaterThan(0);

    const joined = await riya.client.rpc("join_live_class", { p_class_id: classId });
    expect(joined.error).toBeNull();
    expect(joined.data.attendanceRecorded).toBe(true);
    const rejoin = await riya.client.rpc("join_live_class", { p_class_id: classId });
    expect(rejoin.data.firstJoin).toBe(false);

    // Unenrolled student is refused, including by direct RPC/URL and table reads.
    const outsider = await neha.client.rpc("join_live_class", { p_class_id: classId });
    expect(outsider.error?.message).toMatch(/not_enrolled/);
    const outsiderRead = await neha.client.from("live_classes").select("id").eq("id", classId);
    expect(outsiderRead.data ?? []).toHaveLength(0);

    // Shared chat: participants can post while live; outsiders cannot.
    expect((await riya.client.from("live_class_messages").insert({ live_class_id: classId, author_id: riya.userId, body: "Can you show auto layout again?" })).error).toBeNull();
    expect((await neha.client.from("live_class_messages").insert({ live_class_id: classId, author_id: neha.userId, body: "hi" })).error).not.toBeNull();
    const { data: kavyaSees } = await kavya.client.from("live_class_messages").select("body").eq("live_class_id", classId);
    expect((kavyaSees ?? []).map((m) => m.body)).toContain("Can you show auto layout again?");

    expect((await kavya.client.rpc("end_live_class", { p_class_id: classId })).data.status).toBe("completed");
    const late = await riya.client.rpc("join_live_class", { p_class_id: classId });
    expect(late.error?.message).toMatch(/class_not_live:completed/);

    const roster = await kavya.client.rpc("get_live_class_roster", { p_class_id: classId });
    const riyaRow = (roster.data as Array<{ student_id: string; attendance_status: string | null }>).find((r) => r.student_id === riya.userId);
    expect(riyaRow?.attendance_status).toBe("present");

    // Completed classes cannot be restarted.
    expect((await kavya.client.rpc("start_live_class", { p_class_id: classId })).error).not.toBeNull();
  }, 30_000);

  it("counsellor drafts, publishes and schedules; drafts are hidden from the catalog", async () => {
    const anon = createClient(t.url, t.anonKey, { auth: { persistSession: false } });
    const slug = `sim-test-course-${Date.now()}`;
    const draft = await meera.client.from("courses").insert({ title: "Simulation Test Course", slug, price: 4999, mentor_id: vikram.userId, status: "draft" }).select("id").single();
    expect(draft.error).toBeNull();
    const courseId = draft.data!.id as string;
    // The existing course_mentors auto-sync trigger assigns the owning teacher.
    const link = await meera.client.from("course_mentors").select("mentor_id, status").eq("course_id", courseId);
    expect(link.data).toEqual([{ mentor_id: vikram.userId, status: "active" }]);

    expect((await meera.client.from("courses").select("id").eq("id", courseId)).data).toHaveLength(1);
    expect((await anon.from("courses").select("id").eq("id", courseId)).data ?? []).toHaveLength(0);
    expect((await neha.client.from("courses").select("id").eq("id", courseId)).data ?? []).toHaveLength(0);

    expect((await meera.client.from("courses").update({ status: "published" }).eq("id", courseId)).error).toBeNull();
    expect((await anon.from("courses").select("id").eq("id", courseId)).data).toHaveLength(1);

    const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    const base = { course_id: courseId, created_by: meera.userId, title: "Kickoff", scheduled_date: today, start_time: "21:00", end_time: "22:00", meeting_platform: "demo" };
    // Teacher not assigned to the course is rejected.
    expect((await meera.client.from("live_classes").insert({ ...base, mentor_id: kavya.userId })).error).not.toBeNull();
    const scheduled = await meera.client.from("live_classes").insert({ ...base, mentor_id: vikram.userId }).select("id").single();
    expect(scheduled.error).toBeNull();
    expect((await vikram.client.from("live_classes").select("id").eq("id", scheduled.data!.id)).data).toHaveLength(1);
    // A counsellor cannot start a class.
    expect((await meera.client.rpc("start_live_class", { p_class_id: scheduled.data!.id })).error?.code).toBe("42501");

    // Counsellor sees the purchase that landed against the right course.
    const overview = await meera.client.rpc("get_course_purchase_overview", { p_course_id: courseIds["sim-python-for-beginners"] });
    const riyaRow = (overview.data as Array<{ student_id: string; order_status: string; invoice_number: string | null }>).find((r) => r.student_id === riya.userId);
    expect(riyaRow?.order_status).toBe("completed");
    expect(riyaRow?.invoice_number).toMatch(/^SG-INV-/);
    // A student cannot read that overview.
    expect((await riya.client.rpc("get_course_purchase_overview", { p_course_id: courseIds["sim-python-for-beginners"] })).error?.code).toBe("42501");

    // Browsers can never call the payment state functions directly.
    expect((await riya.client.rpc("complete_paid_order", { p_order_id: riyaRow ? "00000000-0000-0000-0000-000000000000" : "", p_provider: "mock", p_provider_payment_id: "x" })).error).not.toBeNull();
  }, 30_000);
});
