// @vitest-environment node
// ============================================================================
// Executes supabase/migrations/20261120000001_resume_builder_multi_resume.sql
// against a real PostgreSQL engine (PGlite = Postgres compiled to WASM) and
// verifies ownership isolation, column grants, the revision trigger, RPCs,
// job de-duplication and the AI quota function.
//
// Supabase-provided objects the migration depends on (auth.uid(), auth.role(),
// the authenticated/anon/service_role roles, storage schema, profiles,
// storage_folder_uuid) are stubbed below with the same signatures/semantics.
// This does not prove the migration applies cleanly to the live project -
// that still needs a review + apply on a branch/staging database.
// ============================================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/20261120000001_resume_builder_multi_resume.sql", import.meta.url)),
  "utf8",
);

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

const SUPABASE_STUBS = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id uuid PRIMARY KEY);
INSERT INTO public.profiles VALUES ('${ALICE}'), ('${BOB}');

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON storage.buckets TO service_role;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
  $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
CREATE FUNCTION public.storage_folder_uuid(object_name text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN ((storage.foldername(object_name))[1])::uuid END $$;
`;

let db: PGlite;

type Who = { uid: string | null; role: "authenticated" | "anon" | "service_role" };
const asAlice: Who = { uid: ALICE, role: "authenticated" };
const asBob: Who = { uid: BOB, role: "authenticated" };
const asService: Who = { uid: null, role: "service_role" };
const asAnon: Who = { uid: null, role: "anon" };

/** Runs SQL inside a transaction as the given Supabase identity; always rolls back the role switch. */
async function run<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`, [
      who.uid ?? "",
      who.role,
    ]);
    await db.exec(`SET LOCAL ROLE ${who.role}`);
    const res = await db.query<T>(sql, params);
    await db.exec("COMMIT");
    return res.rows;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

/** Like run(), for statements that must return exactly one row. */
async function runOne<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []): Promise<T> {
  const rows = await run<T>(who, sql, params);
  if (rows.length !== 1 || rows[0] === undefined) throw new Error(`expected exactly one row, got ${rows.length}`);
  return rows[0];
}

async function createResume(who: Who, title = "Software Developer Resume"): Promise<{ id: string; revision: number }> {
  const row = await runOne<{ id: string; revision: number }>(
    who,
    `INSERT INTO public.resumes (title, target_role, resume_data) VALUES ($1, 'Developer', '{"personal":{"fullName":"Aarav"}}') RETURNING id, revision`,
    [title],
  );
  return row;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(MIGRATION);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec("DELETE FROM public.resume_ai_usage; DELETE FROM public.resumes; DELETE FROM storage.objects;");
});

describe("resumes ownership + RLS", () => {
  it("defaults user_id to the caller and isolates students from each other", async () => {
    const a = await createResume(asAlice);
    await createResume(asBob, "Bob resume");

    const aliceRows = await run<{ id: string; user_id: string }>(asAlice, "SELECT id, user_id FROM public.resumes");
    expect(aliceRows).toHaveLength(1);
    expect(aliceRows[0]).toMatchObject({ id: a.id, user_id: ALICE });

    // Bob can neither read, update nor delete Alice's resume (RLS hides the row).
    expect(await run(asBob, "SELECT id FROM public.resumes WHERE id = $1", [a.id])).toHaveLength(0);
    expect(await run(asBob, "UPDATE public.resumes SET title = 'pwned' WHERE id = $1 RETURNING id", [a.id])).toHaveLength(0);
    expect(await run(asBob, "DELETE FROM public.resumes WHERE id = $1 RETURNING id", [a.id])).toHaveLength(0);
    const still = await runOne<{ title: string }>(asAlice, "SELECT title FROM public.resumes WHERE id = $1", [a.id]);
    expect(still.title).toBe("Software Developer Resume");
  });

  it("refuses a client-chosen owner and server-managed columns", async () => {
    await expect(run(asAlice, `INSERT INTO public.resumes (user_id, title) VALUES ('${BOB}', 'x')`)).rejects.toThrow(/permission denied/);
    await expect(run(asAlice, `INSERT INTO public.resumes (title, status) VALUES ('x', 'completed')`)).rejects.toThrow(/permission denied/);
    const a = await createResume(asAlice);
    await expect(run(asAlice, `UPDATE public.resumes SET latest_pdf_path = 'x' WHERE id = $1`, [a.id])).rejects.toThrow(/permission denied/);
    await expect(run(asAlice, `UPDATE public.resumes SET revision = 99 WHERE id = $1`, [a.id])).rejects.toThrow(/permission denied/);
  });

  it("denies anonymous access entirely", async () => {
    await createResume(asAlice);
    await expect(run(asAnon, "SELECT id FROM public.resumes")).rejects.toThrow(/permission denied/);
  });

  it("validates title, template id and data shape", async () => {
    await expect(run(asAlice, `INSERT INTO public.resumes (title) VALUES ('   ')`)).rejects.toThrow(/resumes_title_length/);
    await expect(run(asAlice, `INSERT INTO public.resumes (title, template_id) VALUES ('x', '../etc')`)).rejects.toThrow(/resumes_template_id_format/);
    await expect(run(asAlice, `INSERT INTO public.resumes (title, resume_data) VALUES ('x', '[]')`)).rejects.toThrow(/resumes_data_is_object/);
  });

  it("caps each student at 50 resumes", async () => {
    await db.exec(`INSERT INTO public.resumes (user_id, title) SELECT '${ALICE}', 'r' || g FROM generate_series(1, 50) g`);
    await expect(createResume(asAlice)).rejects.toThrow(/RESUME_LIMIT_REACHED/);
    await expect(createResume(asBob)).resolves.toBeTruthy();
  });
});

describe("revision trigger (optimistic concurrency)", () => {
  it("bumps revision on content change and lets a stale save match zero rows", async () => {
    const a = await createResume(asAlice);
    expect(a.revision).toBe(1);

    const saved = await runOne<{ revision: number }>(
      asAlice,
      `UPDATE public.resumes SET resume_data = '{"personal":{"fullName":"Aarav Sharma"}}' WHERE id = $1 AND revision = 1 RETURNING revision`,
      [a.id],
    );
    expect(saved.revision).toBe(2);

    // A second tab still holding revision 1 must not overwrite.
    const stale = await run(asAlice, `UPDATE public.resumes SET title = 'old tab' WHERE id = $1 AND revision = 1 RETURNING id`, [a.id]);
    expect(stale).toHaveLength(0);
  });

  it("does not bump revision when nothing changed", async () => {
    const a = await createResume(asAlice);
    const row = await runOne<{ revision: number }>(asAlice, `UPDATE public.resumes SET title = title WHERE id = $1 RETURNING revision`, [a.id]);
    expect(row.revision).toBe(1);
  });

  it("lets the service role set PDF columns but never change the owner", async () => {
    const a = await createResume(asAlice);
    const row = await runOne<{ status: string; revision: number }>(
      asService,
      `UPDATE public.resumes SET status = 'completed', latest_pdf_path = 'x/y/v1.pdf', latest_generated_revision = revision WHERE id = $1 RETURNING status, revision`,
      [a.id],
    );
    expect(row).toEqual({ status: "completed", revision: 1 });
    await expect(run(asService, `UPDATE public.resumes SET user_id = '${BOB}' WHERE id = $1`, [a.id])).rejects.toThrow(/RESUME_OWNER_IMMUTABLE/);
  });
});

describe("RPCs", () => {
  it("get_my_resume_stats counts only the caller's real rows", async () => {
    const a = await createResume(asAlice, "One");
    await createResume(asAlice, "Two");
    await createResume(asBob, "Bob");
    await run(asService, `UPDATE public.resumes SET status = 'completed' WHERE id = $1`, [a.id]);

    const stats = await runOne<{ total_count: number; completed_count: number; draft_count: number; last_updated_title: string }>(
      asAlice,
      "SELECT * FROM public.get_my_resume_stats()",
    );
    expect(stats).toMatchObject({ total_count: 2, completed_count: 1, draft_count: 1 });
    expect(["One", "Two"]).toContain(stats.last_updated_title);

    const empty = await runOne<{ total_count: number; last_updated_id: string | null }>(
      { uid: "33333333-3333-4333-8333-333333333333", role: "authenticated" },
      "SELECT * FROM public.get_my_resume_stats()",
    );
    expect(empty).toMatchObject({ total_count: 0, last_updated_id: null });
  });

  it("duplicate_resume copies content into an independent draft and refuses other students' resumes", async () => {
    const a = await createResume(asAlice);
    await run(asService, `UPDATE public.resumes SET status = 'completed', latest_pdf_path = 'p.pdf' WHERE id = $1`, [a.id]);

    const copy = await runOne<{ id: string; title: string; status: string; latest_pdf_path: string | null; resume_data: unknown }>(
      asAlice,
      "SELECT * FROM public.duplicate_resume($1, NULL)",
      [a.id],
    );
    expect(copy.id).not.toBe(a.id);
    expect(copy).toMatchObject({ title: "Software Developer Resume (Copy)", status: "draft", latest_pdf_path: null });
    expect(copy.resume_data).toEqual({ personal: { fullName: "Aarav" } });

    await run(asAlice, `UPDATE public.resumes SET resume_data = '{"changed":true}' WHERE id = $1`, [copy.id]);
    const orig = await runOne<{ resume_data: unknown }>(asAlice, "SELECT resume_data FROM public.resumes WHERE id = $1", [a.id]);
    expect(orig.resume_data).toEqual({ personal: { fullName: "Aarav" } });

    await expect(run(asBob, "SELECT * FROM public.duplicate_resume($1, 'mine now')", [a.id])).rejects.toThrow(/RESUME_NOT_FOUND/);
  });

  it("create/restore versions: snapshot server data, back up before restore, detect stale restores", async () => {
    const a = await createResume(asAlice);
    const v1 = await runOne<{ id: string; version_number: number; source: string }>(
      asAlice,
      "SELECT * FROM public.create_resume_version($1, 'Initial')",
      [a.id],
    );
    expect(v1).toMatchObject({ version_number: 1, source: "manual" });

    await run(asAlice, `UPDATE public.resumes SET resume_data = '{"personal":{"fullName":"Changed"}}' WHERE id = $1`, [a.id]);

    await expect(run(asAlice, "SELECT * FROM public.restore_resume_version($1, 1)", [v1.id])).rejects.toThrow(/RESUME_REVISION_CONFLICT/);

    const restored = await runOne<{ resume_data: unknown; revision: number }>(asAlice, "SELECT * FROM public.restore_resume_version($1, 2)", [v1.id]);
    expect(restored.resume_data).toEqual({ personal: { fullName: "Aarav" } });
    expect(restored.revision).toBe(3);

    const versions = await run<{ version_number: number; source: string; resume_data_snapshot: unknown }>(
      asAlice,
      "SELECT version_number, source, resume_data_snapshot FROM public.resume_versions WHERE resume_id = $1 ORDER BY version_number",
      [a.id],
    );
    expect(versions.map((v) => v.source)).toEqual(["manual", "restore_backup"]);
    expect(versions[1]?.resume_data_snapshot).toEqual({ personal: { fullName: "Changed" } });

    await expect(run(asBob, "SELECT * FROM public.create_resume_version($1, 'x')", [a.id])).rejects.toThrow(/RESUME_NOT_FOUND/);
    await expect(run(asBob, "SELECT * FROM public.restore_resume_version($1, 3)", [v1.id])).rejects.toThrow(/RESUME_VERSION_NOT_FOUND/);
    expect(await run(asBob, "SELECT id FROM public.resume_versions")).toHaveLength(0);
    await expect(run(asAlice, `INSERT INTO public.resume_versions (resume_id, user_id, version_number, source, title, resume_data_snapshot, schema_version, resume_revision) VALUES ($1, '${ALICE}', 99, 'manual', 't', '{}', 1, 1)`, [a.id])).rejects.toThrow(/permission denied/);
  });

  it("prunes manual versions beyond the retention limit", async () => {
    const a = await createResume(asAlice);
    await db.exec("SET app.resume_version_retention = '3'");
    try {
      for (let i = 0; i < 5; i++) await run(asAlice, "SELECT * FROM public.create_resume_version($1, NULL)", [a.id]);
    } finally {
      await db.exec("RESET app.resume_version_retention");
    }
    const rows = await run<{ version_number: number }>(asAlice, "SELECT version_number FROM public.resume_versions WHERE resume_id = $1 ORDER BY 1", [a.id]);
    expect(rows.map((r) => r.version_number)).toEqual([3, 4, 5]);
  });

  it("deleting a resume cascades to its versions and jobs only", async () => {
    const a = await createResume(asAlice);
    const b = await createResume(asAlice, "Other");
    await run(asAlice, "SELECT * FROM public.create_resume_version($1, NULL)", [a.id]);
    await run(asAlice, "SELECT * FROM public.create_resume_version($1, NULL)", [b.id]);
    await run(asService, `INSERT INTO public.resume_pdf_jobs (resume_id, user_id, requested_revision, template_id) VALUES ($1, '${ALICE}', 1, 'tpl')`, [a.id]);

    await run(asAlice, "DELETE FROM public.resumes WHERE id = $1", [a.id]);
    const left = await run<{ resume_id: string }>(asService, "SELECT resume_id FROM public.resume_versions");
    expect(left.map((r) => r.resume_id)).toEqual([b.id]);
    expect(await run(asService, "SELECT id FROM public.resume_pdf_jobs")).toHaveLength(0);
  });
});

describe("PDF jobs", () => {
  it("allows only one active job per resume and keeps jobs read-only for students", async () => {
    const a = await createResume(asAlice);
    const insertJob = `INSERT INTO public.resume_pdf_jobs (resume_id, user_id, requested_revision, template_id) VALUES ($1, '${ALICE}', 1, 'tpl') RETURNING id`;
    const job = await runOne<{ id: string }>(asService, insertJob, [a.id]);
    await expect(run(asService, insertJob, [a.id])).rejects.toThrow(/uq_resume_pdf_jobs_one_active/);

    await run(asService, "UPDATE public.resume_pdf_jobs SET status = 'failed', error_code = 'COMPILE_FAILED' WHERE id = $1", [job.id]);
    await expect(run(asService, insertJob, [a.id])).resolves.toHaveLength(1);

    expect(await run(asAlice, "SELECT id FROM public.resume_pdf_jobs")).toHaveLength(2);
    expect(await run(asBob, "SELECT id FROM public.resume_pdf_jobs")).toHaveLength(0);
    await expect(run(asAlice, insertJob, [a.id])).rejects.toThrow(/permission denied/);
  });

  it("rejects a job whose user_id does not own the resume", async () => {
    const a = await createResume(asAlice);
    await expect(
      run(asService, `INSERT INTO public.resume_pdf_jobs (resume_id, user_id, requested_revision, template_id) VALUES ($1, '${BOB}', 1, 'tpl')`, [a.id]),
    ).rejects.toThrow(/resume_pdf_jobs_resume_fk/);
  });
});

describe("AI quota", () => {
  it("is service-role only and enforces the per-minute limit", async () => {
    await expect(run(asAlice, `SELECT * FROM public.consume_resume_ai_quota('${ALICE}', 'improve_summary', 2, 10)`)).rejects.toThrow(
      /permission denied/,
    );
    const call = () =>
      runOne<{ allowed: boolean; retry_after_seconds: number }>(asService, `SELECT * FROM public.consume_resume_ai_quota('${ALICE}', 'improve_summary', 2, 10)`);
    expect((await call()).allowed).toBe(true);
    expect((await call()).allowed).toBe(true);
    const blocked = await call();
    expect(blocked.allowed).toBe(false);
    expect(blocked.retry_after_seconds).toBeGreaterThan(0);
    // Bob's quota is independent.
    const bob = await runOne<{ allowed: boolean }>(asService, `SELECT * FROM public.consume_resume_ai_quota('${BOB}', 'improve_summary', 2, 10)`);
    expect(bob.allowed).toBe(true);
  });
});

describe("student-resumes storage policies", () => {
  it("lets students read/delete only their own folder and never upload", async () => {
    await run(asService, `INSERT INTO storage.objects (bucket_id, name) VALUES ('student-resumes', '${ALICE}/r1/v1.pdf'), ('student-resumes', '${BOB}/r2/v1.pdf')`);
    const aliceSees = await run<{ name: string }>(asAlice, "SELECT name FROM storage.objects");
    expect(aliceSees.map((o) => o.name)).toEqual([`${ALICE}/r1/v1.pdf`]);
    expect(await run(asAlice, `DELETE FROM storage.objects WHERE name = '${BOB}/r2/v1.pdf' RETURNING id`)).toHaveLength(0);
    await expect(run(asAlice, `INSERT INTO storage.objects (bucket_id, name) VALUES ('student-resumes', '${ALICE}/r1/evil.pdf')`)).rejects.toThrow(
      /row-level security/,
    );
    const bucket = await runOne<{ public: boolean; allowed_mime_types: string[] }>(asService, "SELECT public, allowed_mime_types FROM storage.buckets WHERE id = 'student-resumes'");
    expect(bucket).toEqual({ public: false, allowed_mime_types: ["application/pdf"] });
  });
});
