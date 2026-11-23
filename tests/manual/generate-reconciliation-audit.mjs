// Generates docs/resume-builder-reconciliation-audit.sql: ONE read-only SELECT that
// compares the live database against what the five unrecorded migrations define.
//
//   node tests/manual/generate-reconciliation-audit.mjs
//
// "Expected" values come from applying the migrations to a real Postgres 17 engine
// (PGlite) with Supabase stubs, including Supabase's default privileges for
// anon/authenticated/service_role, then reading the catalogs. Expressions are
// compared as Postgres deparses them (pg_get_expr / pg_get_constraintdef /
// pg_get_indexdef / pg_get_triggerdef), function bodies by an md5 of the source with
// whitespace collapsed. Nothing here touches a remote database.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const files = readdirSync("supabase/migrations");
const read = (v) => readFileSync(`supabase/migrations/${files.find((f) => f.startsWith(v + "_"))}`, "utf8");

const RESUME = read("20261120000001");
const OTHER = ["20261116000003", "20261117000001", "20261117000002"];

const STUBS = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
-- Supabase grants these on every new public object (supabase/postgres default privileges).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT null::text $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
  $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
CREATE FUNCTION public.storage_folder_uuid(object_name text) RETURNS uuid LANGUAGE sql IMMUTABLE AS
  $$ SELECT null::uuid $$;
`;

const db = new PGlite();
await db.exec(STUBS);
await db.exec(RESUME);
// Other migrations: only their functions + function grants (their tables are not stubbed).
await db.exec("SET check_function_bodies = off;");
// Signature types used by get_public_course_outline (bodies are not validated).
await db.exec("CREATE TYPE public.content_type AS ENUM ('video', 'text', 'pdf', 'quiz', 'assignment');");
for (const v of OTHER) {
  const sql = read(v);
  const fns = sql.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$[\s\S]*?\$\$[^;]*;/gi) ?? [];
  for (const f of fns) await db.exec(f);
  // Only grants for functions created above (e.g. calculate_profile_completion lives elsewhere).
  const created = fns.map((f) => f.match(/FUNCTION\s+public\.(\w+)/i)?.[1]).filter(Boolean);
  const grants = sql.match(/^\s*(GRANT|REVOKE)[^;]*ON FUNCTION[^;]*;/gim) ?? [];
  for (const g of grants) if (created.some((n) => g.includes(`public.${n}(`))) await db.exec(g);
}
// 20261117000001 / 20261117000003 policies: stub only the columns their rules reference
// (types as in 005_files.sql and 20260718000001_crm_schema.sql) so Postgres deparses them.
await db.exec(`
CREATE TABLE public.files (id uuid PRIMARY KEY, bucket text NOT NULL, deleted_at timestamptz);
CREATE TABLE public.leads (id uuid PRIMARY KEY);
CREATE TABLE public.lead_followups (id uuid PRIMARY KEY);
CREATE TABLE public.lead_notes (id uuid PRIMARY KEY, author_id uuid NOT NULL);
CREATE TABLE public.lead_activities (id uuid PRIMARY KEY);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY; ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;`);
for (const v of ["20261117000001", "20261117000003"]) {
  for (const p of read(v).match(/CREATE POLICY[\s\S]*?;/gi) ?? []) await db.exec(p);
}
const OTHER_POLICY_TABLES = ["files", "leads", "lead_followups", "lead_notes", "lead_activities"];

const TABLES = ["resumes", "resume_versions", "resume_pdf_jobs", "resume_ai_usage"];
const RESUME_FUNCS = ["get_my_resume_stats", "duplicate_resume", "create_resume_version", "restore_resume_version",
  "prune_resume_versions", "resume_version_retention", "consume_resume_ai_quota", "resumes_before_write", "resumes_enforce_limit"];
const OTHER_FUNCS = ["has_permission", "get_current_permissions", "get_unread_notification_count",
  "is_published_course_media_file", "get_public_course_outline"];
const ROLES = ["anon", "authenticated"];

const q = async (sql, params) => (await db.query(sql, params)).rows;
const lit = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const vals = (rows, cols) => rows.map((r) => `(${cols.map((c) => lit(r[c])).join(",")})`).join(",\n    ");

const tbl = `(${TABLES.map(lit).join(",")})`;

const columns = await q(`select c.relname t, a.attname col, format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' NOT NULL' else '' end
  || coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '') def
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where n.nspname='public' and c.relname in ${tbl} and a.attnum>0 and not a.attisdropped order by 1,2`);
const constraints = await q(`select c.relname t, k.conname obj, pg_get_constraintdef(k.oid) def
  from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ${tbl} order by 1,2`);
const indexes = await q(`select tablename t, indexname obj, indexdef def from pg_indexes where schemaname='public' and tablename in ${tbl} order by 1,2`);
const rls = await q(`select relname t, (relrowsecurity::text || '/' || relforcerowsecurity::text) def from pg_class
  where relnamespace='public'::regnamespace and relname in ${tbl} order by 1`);
const policies = await q(`select schemaname||'.'||tablename t, policyname obj,
  cmd || ' TO ' || array_to_string(roles, ',') || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') def
  from pg_policies where (schemaname='public' and tablename in ${tbl}) or (schemaname='storage' and policyname like 'student_resumes_%') order by 1,2`);
const otherPolicies = await q(`select schemaname||'.'||tablename t, policyname obj,
  cmd || ' TO ' || array_to_string(roles, ',') || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') def
  from pg_policies where schemaname='public' and tablename in (${OTHER_POLICY_TABLES.map(lit).join(",")}) order by 1,2`);
if (otherPolicies.length !== 11) throw new Error(`expected 11 other policies, got ${otherPolicies.length}`);
const tablePrivs = [];
for (const t of TABLES) for (const r of ROLES) for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
  const [{ v }] = await q(`select has_table_privilege($1, $2, $3)::text v`, [r, `public.${t}`, p]);
  tablePrivs.push({ t, obj: `${r}:${p}`, def: v });
}
const colPrivs = await q(`select table_name t, grantee || ':' || privilege_type || ':' || column_name obj, 'granted' def
  from information_schema.column_privileges where table_schema='public' and table_name in ${tbl}
  and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE') order by 1,2`);
const triggers = await q(`select c.relname t, g.tgname obj, pg_get_triggerdef(g.oid) def from pg_trigger g join pg_class c on c.oid=g.tgrelid
  where not g.tgisinternal and c.relnamespace='public'::regnamespace and c.relname in ${tbl} order by 1,2`);
const fnSql = (names) => `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' obj,
  md5(regexp_replace(btrim(p.prosrc), '\\s+', ' ', 'g')) || ' secdef=' || p.prosecdef::text || ' vol=' || p.provolatile::text
  || ' cfg=' || coalesce(array_to_string(p.proconfig, ';'), '-') || ' ret=' || pg_get_function_result(p.oid) def,
  has_function_privilege('anon', p.oid, 'EXECUTE')::text anon_x, has_function_privilege('authenticated', p.oid, 'EXECUTE')::text auth_x
  from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in (${names.map(lit).join(",")}) order by 1`;
const resumeFns = await q(fnSql(RESUME_FUNCS));
const otherFns = await q(fnSql(OTHER_FUNCS));
const bucket = await q(`select id obj, 'public=' || public || ' limit=' || coalesce(file_size_limit::text,'-') || ' mime=' || coalesce(array_to_string(allowed_mime_types, ','), '-') def from storage.buckets where id='student-resumes'`);

if (resumeFns.length !== 9 || otherFns.length !== 5) throw new Error(`expected 9+5 functions, got ${resumeFns.length}+${otherFns.length}`);

// Live-side expressions, identical to the ones used for "expected" above.
const LIVE = {
  column: `select c.relname t, a.attname obj, format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' NOT NULL' else '' end
      || coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '') def
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where n.nspname='public' and c.relname in ${tbl} and a.attnum>0 and not a.attisdropped`,
  constraint: `select c.relname t, k.conname obj, pg_get_constraintdef(k.oid) def
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ${tbl}`,
  index: `select tablename::text t, indexname::text obj, indexdef def from pg_indexes where schemaname='public' and tablename in ${tbl}`,
  rls: `select relname::text t, relname::text obj, (relrowsecurity::text || '/' || relforcerowsecurity::text) def from pg_class
    where relnamespace='public'::regnamespace and relname in ${tbl}`,
  policy: `select (schemaname||'.'||tablename)::text t, policyname::text obj,
      cmd || ' TO ' || array_to_string(roles, ',') || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') def
    from pg_policies where (schemaname='public' and tablename in ${tbl}) or (schemaname='storage' and (policyname like 'student_resumes_%'
      or coalesce(qual,'') || coalesce(with_check,'') like '%student-resumes%'))`,
  colpriv: `select table_name::text t, (grantee || ':' || privilege_type || ':' || column_name)::text obj, 'granted' def
    from information_schema.column_privileges where table_schema='public' and table_name in ${tbl}
    and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE')`,
  trigger: `select c.relname::text t, g.tgname::text obj, pg_get_triggerdef(g.oid) def from pg_trigger g join pg_class c on c.oid=g.tgrelid
    where not g.tgisinternal and c.relnamespace='public'::regnamespace and c.relname in ${tbl}`,
};

const section = (name, rows, live, { extras = true } = {}) => `
-- ${name}: expected from the repository vs live
, exp_${name}(t, obj, def) as (values
    ${vals(rows, ["t", "obj", "def"])})
, live_${name} as (${live})
, cmp_${name} as (
  select '${name}' as section, coalesce(e.t, l.t) as tbl, coalesce(e.obj, l.obj) as object,
    case when l.obj is null then 'MISSING' when e.obj is null then 'EXTRA (not in repo)'
       when replace(e.def, 'public.', '') = replace(l.def, 'public.', '') then 'MATCH' else 'DIFF' end as status,
    case when e.def is distinct from l.def then e.def end as expected, case when e.def is distinct from l.def then l.def end as live
  from exp_${name} e full join live_${name} l on l.t = e.t and l.obj = e.obj
  ${extras ? "" : "where e.obj is not null"})`;

const fnSection = (name, rows) => `
, exp_${name}(obj, def, anon_x, auth_x) as (values
    ${vals(rows, ["obj", "def", "anon_x", "auth_x"])})
, live_${name} as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' obj,
    md5(regexp_replace(btrim(p.prosrc), '\\s+', ' ', 'g')) || ' secdef=' || p.prosecdef::text || ' vol=' || p.provolatile::text
    || ' cfg=' || coalesce(array_to_string(p.proconfig, ';'), '-') || ' ret=' || pg_get_function_result(p.oid) def,
    has_function_privilege('anon', p.oid, 'EXECUTE')::text anon_x, has_function_privilege('authenticated', p.oid, 'EXECUTE')::text auth_x
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (select split_part(obj, '(', 1) from exp_${name}))
, cmp_${name} as (
  select '${name}' as section, ''::text as tbl, coalesce(e.obj, l.obj) as object,
    case when l.obj is null then 'MISSING' when e.obj is null then 'EXTRA overload (not in repo)'
         when e.def <> l.def then 'DIFF (body or attributes)'
         when (e.anon_x, e.auth_x) is distinct from (l.anon_x, l.auth_x) then 'DIFF (execute grants)' else 'MATCH' end as status,
    case when (e.def, e.anon_x, e.auth_x) is distinct from (l.def, l.anon_x, l.auth_x) then e.def || ' anon=' || e.anon_x || ' auth=' || e.auth_x end as expected,
    case when (e.def, e.anon_x, e.auth_x) is distinct from (l.def, l.anon_x, l.auth_x) then l.def || ' anon=' || l.anon_x || ' auth=' || l.auth_x end as live
  from exp_${name} e full join live_${name} l on l.obj = e.obj)`;

const out = `-- ============================================================================
-- Resume Builder + unrecorded-migrations RECONCILIATION AUDIT (READ-ONLY).
-- One SELECT; nothing is created, changed or deleted. Run in the SQL Editor of
-- project eapvwsikjqdizoncfntm and export ALL rows (Export -> CSV).
-- Generated by tests/manual/generate-reconciliation-audit.mjs from the repo
-- migrations applied to Postgres 17 (PGlite) with Supabase default privileges.
-- status: MATCH | DIFF | MISSING | EXTRA. "expected"/"live" are shown only when they differ.
-- ============================================================================
with _start as (select 1)
${section("column", columns.map((r) => ({ t: r.t, obj: r.col, def: r.def })), LIVE.column)}
${section("constraint", constraints, LIVE.constraint)}
${section("index", indexes, LIVE.index)}
${section("rls", rls.map((r) => ({ t: r.t, obj: r.t, def: r.def })), LIVE.rls)}
${section("policy", policies, LIVE.policy)}
${section("table_priv", tablePrivs, `select t, obj, has_table_privilege(split_part(obj, ':', 1), 'public.' || t, split_part(obj, ':', 2))::text def from exp_table_priv`)}
${section("column_priv", colPrivs, LIVE.colpriv)}
${section("trigger", triggers, LIVE.trigger)}
${fnSection("resume_fn", resumeFns)}
${fnSection("other_fn", otherFns)}
, exp_bucket(t, obj, def) as (values ${vals(bucket.map((b) => ({ t: "storage.buckets", ...b })), ["t", "obj", "def"])})
, cmp_bucket as (
  select 'bucket' as section, e.t as tbl, e.obj as object,
    case when b.id is null then 'MISSING' when e.def = l.def then 'MATCH' else 'DIFF' end as status,
    case when e.def is distinct from l.def then e.def end as expected, case when e.def is distinct from l.def then l.def end as live
  from exp_bucket e
  left join storage.buckets b on b.id = e.obj
  left join lateral (select 'public=' || b.public || ' limit=' || coalesce(b.file_size_limit::text,'-') || ' mime=' || coalesce(array_to_string(b.allowed_mime_types, ','), '-') as def) l on b.id is not null)
-- 20261116000003 seeds: 5 course permissions and their role links
, exp_perm(slug, roles) as (values
    ('courses.create','admin,mentor'),('courses.view','admin,mentor'),('courses.update_own','admin,mentor'),
    ('courses.update_all','admin'),('courses.publish','admin'))
, cmp_perm as (
  select 'rbac_seed' as section, 'public.permissions' as tbl, e.slug as object,
    case when p.id is null then 'MISSING permission'
         -- exact: an extra role (e.g. mentor holding courses.update_all) is a privilege escalation, not a match
         when coalesce(lr.roles,'') = e.roles then 'MATCH' else 'DIFF (role links)' end as status,
    case when coalesce(lr.roles,'') <> e.roles then e.roles end as expected, case when coalesce(lr.roles,'') <> e.roles then coalesce(lr.roles,'(none)') end as live
  from exp_perm e
  left join public.permissions p on p.slug = e.slug
  left join lateral (select string_agg(r.code, ',' order by r.code) roles from public.role_permissions rp join public.roles r on r.id = rp.role_id
                     where rp.permission_id = p.id and r.code in ('admin','mentor')) lr on true)
-- 20261117000001 / 20261117000003 policies: exact rule comparison (other existing policies on these tables are not judged here)
${section("other_pol", otherPolicies, `select (schemaname||'.'||tablename)::text t, policyname::text obj,
      cmd || ' TO ' || array_to_string(roles, ',') || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') def
    from pg_policies where schemaname = 'public' and tablename in (${OTHER_POLICY_TABLES.map(lit).join(",")})`, { extras: false })}
select * from (
  select * from cmp_column union all select * from cmp_constraint union all select * from cmp_index
  union all select * from cmp_rls union all select * from cmp_policy union all select * from cmp_table_priv
  union all select * from cmp_column_priv union all select * from cmp_trigger
  union all select * from cmp_resume_fn union all select * from cmp_other_fn union all select * from cmp_bucket
  union all select * from cmp_perm union all select * from cmp_other_pol
  -- The V2 builder has never been deployed, so these should all be 0; rows mean something else wrote to them.
  union all select 'row_count', 'public.resumes', 'rows', 'INFO', '0', (select count(*) from public.resumes)::text
  union all select 'row_count', 'public.resume_versions', 'rows', 'INFO', '0', (select count(*) from public.resume_versions)::text
  union all select 'row_count', 'public.resume_pdf_jobs', 'rows', 'INFO', '0', (select count(*) from public.resume_pdf_jobs)::text
  union all select 'row_count', 'public.resume_ai_usage', 'rows', 'INFO', '0', (select count(*) from public.resume_ai_usage)::text
  union all select 'row_count', 'storage.objects', 'student-resumes files', 'INFO', '0', (select count(*) from storage.objects where bucket_id = 'student-resumes')::text
  union all select 'migration_history', 'supabase_migrations.schema_migrations', version, 'RECORDED', null, coalesce(name, '')
    from supabase_migrations.schema_migrations where version >= '20261116000000'
) audit
order by case when status like 'MATCH%' then 1 else 0 end, section, tbl, object;
`;
writeFileSync("docs/resume-builder-reconciliation-audit.sql", out);

// Standalone check for the 11 policies the first audit run reported as "PRESENT (review rule)".
// Deparsed function names are qualified only when not on search_path, so compare with "public." removed.
const policyCheck = `-- ============================================================================
-- 20261117000001 + 20261117000003 POLICY CHECK (READ-ONLY: one SELECT).
-- Run in the SQL Editor of project eapvwsikjqdizoncfntm. Expected: 11 rows, all MATCH.
-- Generated by tests/manual/generate-reconciliation-audit.mjs (rules deparsed by Postgres 17).
-- ============================================================================
with exp(t, obj, def) as (values
    ${vals(otherPolicies, ["t", "obj", "def"])})
, live as (
  select (schemaname||'.'||tablename)::text t, policyname::text obj,
    cmd || ' TO ' || array_to_string(roles, ',') || ' USING ' || coalesce(qual,'-') || ' CHECK ' || coalesce(with_check,'-') def
  from pg_policies where schemaname = 'public' and tablename in (${OTHER_POLICY_TABLES.map(lit).join(",")}))
select e.t as tbl, e.obj as policy,
  case when l.obj is null then 'MISSING' when replace(e.def, 'public.', '') = replace(l.def, 'public.', '') then 'MATCH' else 'DIFF' end as status,
  case when l.obj is null or replace(e.def, 'public.', '') <> replace(l.def, 'public.', '') then e.def end as expected,
  case when l.obj is not null and replace(e.def, 'public.', '') <> replace(l.def, 'public.', '') then l.def end as live
from exp e left join live l on l.t = e.t and l.obj = e.obj
order by case when l.obj is not null and replace(e.def, 'public.', '') = replace(l.def, 'public.', '') then 1 else 0 end, e.t, e.obj;
`;
writeFileSync("docs/resume-builder-policy-check.sql", policyCheck);
console.log(`wrote docs/resume-builder-reconciliation-audit.sql: ${columns.length} columns, ${constraints.length} constraints, ${indexes.length} indexes, ${policies.length} policies, ${tablePrivs.length} table privs, ${colPrivs.length} column privs, ${triggers.length} triggers, ${resumeFns.length}+${otherFns.length} functions`);
