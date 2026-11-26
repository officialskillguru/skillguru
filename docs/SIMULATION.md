# End-to-end simulation: counsellor → student → teacher

A local, isolated run of the real SkillGuru app in which one course moves from a
counsellor's draft to the published catalog, a student buys it (with a simulated
payment), the assigned teacher starts the class, and the student joins and is
marked present. All three portals read and write the same records (course,
order, payment, enrollment, live class, attendance) through the normal app
services, RLS and Edge Functions — there is no separate demo adapter.

Everything here runs against a **local Supabase stack** (Docker). Nothing touches
the hosted project. People, courses, prices and payments are fictional.

## What is real and what is simulated

| Area | Behaviour |
|---|---|
| Courses, publishing, catalog, enrollments, orders, receipts, attendance, notifications | Real app code and database (RLS enforced) |
| Payments | `PAYMENT_PROVIDER=mock`. Same Edge Functions as production (`create-order`, `verify-payment`, `payment-webhook`), plus the mock-only `simulate-payment` gateway for decline / bank-pending / bank-callback. No card or bank details are collected; no money moves. |
| Classroom | Class status, join rules, attendance and chat are real. Video, audio and screen share are simulated (labelled "Simulated room"). |
| Status updates across panels | Polling (lists every 5 s, open room every 4 s, chat every 3 s). |
| Times | Stored and shown as India Standard Time (IST). |
| Batches / cohorts | Not part of this product's data model; classes attach to a course. |

## One-time setup (clean checkout)

Requirements: Node 22+, Docker Desktop running, the repo's Supabase CLI (`npx supabase`).

```bash
npm install
npx supabase start          # local Postgres/Auth/Storage/Edge runtime; applies supabase/migrations
npm run demo:reset          # verifies the target is local, seeds accounts/courses/classes,
                            # writes .env.demo.local and supabase/functions/.env.demo.local
```

`npm run demo:check` only verifies the target (local + migrated) and changes nothing.

## Start the simulation (two terminals)

```bash
npm run demo:functions      # terminal 1: Edge Functions with PAYMENT_PROVIDER=mock
npm run dev:demo            # terminal 2: app on http://127.0.0.1:5180
```

The demo app uses its own port (5180, bound to 127.0.0.1) so it never collides
with a regular `npm run dev` that points at the hosted project. For two
independent sign-ins in one browser, use `http://127.0.0.1:5180` for one role and
`http://localhost:5180` for the other (different origins keep separate sessions),
or use a private window.

## Accounts

All accounts share the password in `DEMO_SIM_PASSWORD` inside `.env.demo.local`
(generated, git-ignored — it is never committed or printed in docs).

| Role | Email | Starting state |
|---|---|---|
| Counsellor | counsellor.meera@demo.skillguru.local | Manages courses |
| Teacher (assigned) | teacher.vikram@demo.skillguru.local | Teaches Data Analytics, Full-Stack, Python |
| Teacher (other course) | teacher.kavya@demo.skillguru.local | Teaches UI/UX — used to show role boundaries |
| Student (new buyer) | student.riya@demo.skillguru.local | No purchases |
| Student (existing learner) | student.aditya@demo.skillguru.local | Owns Full-Stack, attended yesterday's class |
| Student (not enrolled) | student.neha@demo.skillguru.local | Used to show access is refused |

Seeded courses: **Data Analytics with Python & Power BI** (draft, ₹14,999 — the
one the walkthrough publishes and sells), Full-Stack Web Development with React &
Node.js (₹24,999), UI/UX Design Fundamentals with Figma (₹12,499), Python
Programming for Beginners (₹7,999). Session dates are generated from the seed run
(yesterday = completed, today = upcoming, +2 days = scheduled), so re-run
`npm run demo:reset` on the day you present.

## Five-minute walkthrough

**Counsellor** (`127.0.0.1:5180`, sign in as Meera)
1. Sidebar **Courses** → open **Data Analytics with Python & Power BI** (status *Draft*).
2. **Review & publish** tab: every checklist item shows *Done* → click **Publish course**. Status becomes *Published*; **View in catalog** appears.
3. **Teacher & classes** tab: teacher is Vikram Sethi → **Schedule class** → title `Live Session 1: Python for Analysts`, today, a start time ~30 min from now, 60 min → **Schedule class**. It is listed as *Scheduled*.

**Student** (`localhost:5180`, sign in as Riya)
4. **Explore Courses** → the course → its **Live Class Schedule** lists the new session → **Enroll Now**.
5. **Your details** is prefilled. (To show validation, enter mobile `12345` and clear City → **Continue to review** — fields are flagged and you stay on step 1. Fix them.) → **Continue to review** → **Continue to payment · ₹14,999**.
6. **Payment**: choose **Debit / Credit card**, presenter control **Decline** → **Pay ₹14,999** → *Payment declined* (no access granted). Click **Retry payment**, choose **UPI**, **Approve** → **Pay ₹14,999** → *Payment successful — you're enrolled* with order reference and receipt `SG-INV-…`.
7. Optional: **Resend payment confirmation** (presenter check) — both duplicates are recognised and ignored.
8. **Go to My Learning** (course listed) → sidebar **Live Classes**: the session shows *Scheduled — waiting for the teacher*. **Payments & Receipts** shows the declined attempt and the paid order with its receipt.

**Teacher** (sign in as Vikram, e.g. sign the counsellor out or use a private window)
9. **Live Classes** → the session card → **Start class** → confirm (shows eligible students, including Riya) → **Start class**. The classroom opens.

**Student**
10. Within ~5 s the card shows **Live now** → **Join class**. Post a chat message.

**Teacher**
11. The **Attendance** panel shows Riya *Joined*; her message appears in **Class chat** → **End class** → confirm. The view switches to *Class ended* with Riya *Present*.

**Student**
12. The room switches to *This class has ended*.

**Counsellor**
13. Course → **Enrollments & payments**: Riya — *Active*, *Paid*, UPI, ₹14,999, receipt number.

Extra demonstrations: open the class room URL as **Neha** (refused: not enrolled);
open it as **Kavya** (refused: not the course's teacher); choose **Bank pending**
at payment to show the processing state, then **Simulate bank confirmation**.

## Reset / replay

```bash
npm run demo:reset
```

Deletes only rows attributable to the simulation (users `@demo.skillguru.local`
and courses owned by the simulation teachers, including any course the counsellor
created during a run) and re-seeds the documented starting state. It refuses to
run unless the Supabase API and database URLs are localhost.

## Automated verification

```bash
# Backend acceptance (real Postgres/RLS/Edge Functions); needs demo:functions running
npm run demo:reset && SIM_INTEGRATION=1 npx vitest run tests/integration/simulation-flow.test.ts

# Full UI walkthrough + adjacent-screen regression (Playwright, separate browser contexts per role)
npm run demo:reset && npx playwright test -c playwright.simulation.config.ts
npm run demo:reset          # restore the starting state afterwards
```

Screenshots of every checkpoint are written to `test-results/simulation/`.

## Notes for maintainers

- **Local grants.** The hosted project predates Supabase's change to stop auto-granting
  table privileges; recent CLI images do not grant them, so a freshly migrated local
  stack returns "permission denied" for every table. `scripts/demo-sim/local-grants.sql`
  (plus a migration-aware function-grant step in the seed) restores the hosted project's
  legacy grants **on the local stack only**; RLS remains the access boundary. It never
  runs against a hosted project.
- **Migration** `supabase/migrations/20261125000001_simulation_checkout_and_live_class_flow.sql`
  is additive and idempotent and has been applied only to the local stack. Before applying
  it anywhere with real data, confirm no order already has two invoices or two completed
  payments (the new unique indexes would refuse to build). Production deployment needs its
  own review and approval.
