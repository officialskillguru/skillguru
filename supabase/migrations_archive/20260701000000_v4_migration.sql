
-- 20260701000000_enterprise_schema_v4_final.sql

-- =========================================================================
-- 1. ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'cancelled', 'suspended');
  CREATE TYPE public.certificate_type AS ENUM ('completion', 'excellence', 'participation');
  CREATE TYPE public.course_status AS ENUM ('draft', 'review', 'published', 'archived');
  CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'blocked', 'graduated');
  CREATE TYPE public.mentor_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
  CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');
  CREATE TYPE public.mentor_role AS ENUM ('lead', 'assistant', 'guest', 'replacement');
  CREATE TYPE public.resource_type AS ENUM ('video', 'pdf', 'assignment', 'zip', 'external', 'article');
  CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================================
-- 2. SYSTEM INFRASTRUCTURE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  endpoint text not null,
  requests integer not null default 1,
  window_start timestamptz not null,
  unique(user_id, endpoint, window_start)
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status public.job_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'pending',
  retries integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id text primary key, -- e.g. 'WELCOME_EMAIL', 'COURSE_COMPLETE'
  title_template text not null,
  body_template text not null,
  type text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  user_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  severity text not null default 'info',
  source text not null default 'web',
  request_id text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null unique,
  mime text not null,
  size bigint not null,
  sha256 text,
  etag text,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

-- =========================================================================
-- 3. PROFILES, PREFERENCES & NOTIFICATIONS
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS avatar_file_id uuid REFERENCES public.files(id),
  ADD COLUMN IF NOT EXISTS student_status public.student_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid primary key references public.profiles(id) on delete cascade,
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  marketing_emails boolean not null default false,
  dashboard_layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.mentors (
  id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  skills text[] default '{}',
  designation text,
  status public.mentor_status not null default 'pending',
  linkedin_url text,
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 4. LMS ARCHITECTURE (Courses, Modules, Lessons, Quizzes)
-- =========================================================================
ALTER TABLE public.courses
  DROP COLUMN IF EXISTS mentor_id,
  DROP COLUMN IF EXISTS is_published,
  DROP COLUMN IF EXISTS status,
  ADD COLUMN IF NOT EXISTS status public.course_status not null default 'draft',
  ADD COLUMN IF NOT EXISTS thumbnail_file_id uuid REFERENCES public.files(id),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE TABLE IF NOT EXISTS public.mentor_courses (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  role public.mentor_role not null default 'lead',
  assigned_at timestamptz not null default now(),
  unique(mentor_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  duration_seconds integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  type public.resource_type not null,
  file_id uuid references public.files(id),
  url text,
  created_at timestamptz not null default now()
);

-- Normalized Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  passing_score integer not null default 80,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple_choice',
  points integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0
);

-- =========================================================================
-- 5. PROGRESS, ENROLLMENTS & CERTIFICATES
-- =========================================================================
ALTER TABLE IF EXISTS public.student_enrollments ADD COLUMN IF NOT EXISTS status public.enrollment_status not null default 'active'; CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  unique(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
  completed boolean not null default false,
  watched_seconds integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer,
  passed boolean,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_id uuid references public.quiz_options(id),
  text_answer text,
  is_correct boolean,
  created_at timestamptz not null default now()
);

ALTER TABLE IF EXISTS public.certificates ADD COLUMN IF NOT EXISTS credential_id text, ADD COLUMN IF NOT EXISTS verification_hash text, ADD COLUMN IF NOT EXISTS verification_url text, ADD COLUMN IF NOT EXISTS pdf_file_id uuid, ADD COLUMN IF NOT EXISTS issued_by uuid; CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
  credential_id text not null unique,
  verification_hash text not null unique,
  verification_url text not null,
  issued_by uuid references public.profiles(id),
  pdf_file_id uuid references public.files(id),
  type public.certificate_type not null default 'completion',
  issued_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  unique(student_id, course_id)
);

-- =========================================================================
-- 6. PAYMENTS & TRANSACTIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  total_amount integer not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  amount integer not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  gateway text not null,
  gateway_transaction_id text,
  status public.payment_status not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount integer not null,
  reason text,
  status text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- 7. AI INFRASTRUCTURE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text,
  context text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  conversation_id uuid references public.ai_conversations(id),
  prompt_tokens integer not null,
  completion_tokens integer not null,
  model text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id),
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);


-- =========================================================================
-- 8. INDEXES (Full-Text & Composite)
-- =========================================================================
-- Search Indexes (using Postgres tsvector)
CREATE INDEX IF NOT EXISTS idx_courses_title_search ON public.courses USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_lessons_title_search ON public.lessons USING GIN (to_tsvector('english', title));
-- skipped crm_leads

-- Composite Indexes
CREATE INDEX IF NOT EXISTS idx_student_enrollments_composite ON public.student_enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_courses_status_composite ON public.courses(id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_course_progress_composite ON public.course_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_files_hash ON public.files(sha256);

-- =========================================================================
-- 9. AUTH TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  requested_status text := coalesce(new.raw_user_meta_data->>'status', case when requested_role = 'mentor' then 'pending' else 'active' end);
  full_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
BEGIN
  IF requested_role NOT IN ('student', 'mentor', 'admin') THEN
    requested_role := 'student';
  END IF;
  
  -- Create Profile
  INSERT INTO public.profiles (id, email, role, status, full_name, phone, city, state)
  VALUES (
    new.id, new.email, requested_role::public.portal_role, requested_status::public.account_status,
    full_name, new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'city', new.raw_user_meta_data->>'state'
  )
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;

  -- Create Default Preferences
  INSERT INTO public.user_preferences (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;

  -- Initialize Welcome Notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (new.id, 'Welcome to SkillGuru', 'Your account has been created successfully.', 'system');

  -- Mentor Specifics
  IF requested_role = 'mentor' THEN
    INSERT INTO public.mentors (id, designation, status)
    VALUES (new.id, 'Mentor', 'pending'::public.mentor_status)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- =========================================================================
-- 10. DASHBOARD RPC FUNCTIONS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_student_dashboard(p_student_id uuid) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'active_enrollments', (SELECT count(*) FROM public.student_enrollments WHERE student_id = p_student_id AND status = 'active'),
    'completed_courses', (SELECT count(*) FROM public.student_enrollments WHERE student_id = p_student_id AND status = 'completed'),
    'certificates_earned', (SELECT count(*) FROM public.certificates WHERE student_id = p_student_id),
    'unread_notifications', (SELECT count(*) FROM public.notifications WHERE user_id = p_student_id AND read_at IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard() RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_students', (SELECT count(*) FROM public.profiles WHERE role = 'student'),
    'total_mentors', (SELECT count(*) FROM public.profiles WHERE role = 'mentor'),
    'active_courses', (SELECT count(*) FROM public.courses WHERE status = 'published'),
    'total_revenue', (SELECT coalesce(sum(amount), 0) FROM public.payments WHERE status = 'completed')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_mentor_dashboard(p_mentor_id uuid) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'assigned_courses', (SELECT count(*) FROM public.mentor_courses WHERE mentor_id = p_mentor_id),
    'active_students', (
      SELECT count(distinct e.student_id) FROM public.student_enrollments e
      JOIN public.mentor_courses mc ON e.course_id = mc.course_id
      WHERE mc.mentor_id = p_mentor_id AND e.status = 'active'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_course_dashboard(p_course_id uuid) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_enrollments', (SELECT count(*) FROM public.student_enrollments WHERE course_id = p_course_id),
    'completion_rate', (
      SELECT CASE WHEN count(*) = 0 THEN 0 ELSE (count(*) FILTER (WHERE status = 'completed')::float / count(*)::float) * 100 END
      FROM public.student_enrollments WHERE course_id = p_course_id
    )
  );
$$;

-- skipped get_crm_dashboard

-- Issue a certificate RPC
CREATE OR REPLACE FUNCTION public.issue_certificate(p_student_id uuid, p_course_id uuid, p_issued_by uuid, p_pdf_file_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_enrollment_id uuid;
  v_cert_id uuid;
  v_hash text;
BEGIN
  SELECT id INTO v_enrollment_id FROM public.student_enrollments WHERE student_id = p_student_id AND course_id = p_course_id AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Student must complete course before certification'; END IF;
  v_hash := encode(digest(p_student_id::text || p_course_id::text || now()::text, 'sha256'), 'hex');
  INSERT INTO public.certificates (student_id, course_id, enrollment_id, credential_id, verification_hash, verification_url, issued_by, pdf_file_id)
  VALUES (p_student_id, p_course_id, v_enrollment_id, upper(substring(v_hash from 1 for 10)), v_hash, 'https://skillguru.app/verify/' || v_hash, p_issued_by, p_pdf_file_id) RETURNING id INTO v_cert_id;
  RETURN v_cert_id;
END;
$$;
