do $$
begin
  alter type public.app_role add value if not exists 'super_admin';
  alter type public.app_role add value if not exists 'editor';
  alter type public.app_role add value if not exists 'mentor_manager';
  alter type public.app_role add value if not exists 'course_manager';
  alter type public.app_role add value if not exists 'crm_manager';
exception
  when undefined_object then null;
end $$;

do $$
begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.account_status as enum ('active', 'inactive', 'disabled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.crm_lead_status as enum ('new', 'contacted', 'qualified', 'follow_up', 'converted', 'lost');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(r.name::text), array[]::text[])
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$;

create or replace function public.has_app_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from unnest(public.current_user_roles()) as user_role
    where user_role = any(required_roles)
  );
$$;

alter table public.users
  add column if not exists email text,
  add column if not exists profile_image text,
  add column if not exists theme text default 'system',
  add column if not exists language text default 'en',
  add column if not exists email_notifications boolean not null default true,
  add column if not exists sms_notifications boolean not null default false;

alter table public.course_categories
  add column if not exists updated_at timestamptz not null default now();

alter table public.courses
  add column if not exists short_description text,
  add column if not exists mentor_id uuid,
  add column if not exists discount_price integer,
  add column if not exists level text,
  add column if not exists thumbnail text,
  add column if not exists banner text,
  add column if not exists status public.content_status not null default 'draft',
  add column if not exists featured boolean not null default false,
  add column if not exists certificate_available boolean not null default false;

do $$
begin
  alter table public.courses
    add constraint courses_mentor_id_fkey foreign key (mentor_id) references public.faculty(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  designation text not null,
  bio text not null,
  experience_years integer not null default 0,
  linkedin_url text,
  profile_image text,
  skills text[] not null default '{}',
  status public.account_status not null default 'active',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_education (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  institution text not null,
  degree text not null,
  start_year integer,
  end_year integer,
  sort_order integer not null default 0
);

create table if not exists public.mentor_certifications (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  title text not null,
  issuer text,
  issued_at date,
  credential_url text,
  sort_order integer not null default 0
);

create table if not exists public.mentor_experience (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  company text not null,
  role text not null,
  start_date date,
  end_date date,
  description text,
  sort_order integer not null default 0
);

create table if not exists public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  student_id uuid,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  city text,
  state text,
  course_id uuid references public.courses(id) on delete set null,
  mentor_id uuid references public.mentors(id) on delete set null,
  enrollment_date date,
  status public.account_status not null default 'active',
  profile_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.mentor_reviews
    add constraint mentor_reviews_student_id_fkey foreign key (student_id) references public.students(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.app_role not null default 'admin',
  status public.account_status not null default 'active',
  profile_image text,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists name text,
  add column if not exists crm_status public.crm_lead_status not null default 'new',
  add column if not exists course_interest text,
  add column if not exists assigned_to uuid references public.admin_accounts(id) on delete set null,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.admin_accounts(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_timeline (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  actor_id uuid references public.admin_accounts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.success_stories
  add column if not exists student_name text,
  add column if not exists course_name text,
  add column if not exists company_name text,
  add column if not exists package text,
  add column if not exists testimonial text,
  add column if not exists image text,
  add column if not exists video_url text,
  add column if not exists featured boolean not null default false,
  add column if not exists status public.content_status not null default 'draft',
  add column if not exists updated_at timestamptz not null default now();

alter table public.audit_logs
  add column if not exists table_name text,
  add column if not exists record_id uuid,
  add column if not exists ip_address inet;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mentors enable row level security;
alter table public.mentor_education enable row level security;
alter table public.mentor_certifications enable row level security;
alter table public.mentor_experience enable row level security;
alter table public.mentor_reviews enable row level security;
alter table public.students enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_timeline enable row level security;
alter table public.activity_logs enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select table_name
    from (values
      ('course_categories'),
      ('courses'),
      ('mentors'),
      ('mentor_education'),
      ('mentor_certifications'),
      ('mentor_experience'),
      ('mentor_reviews'),
      ('students'),
      ('admin_accounts'),
      ('leads'),
      ('lead_notes'),
      ('lead_timeline'),
      ('success_stories'),
      ('audit_logs'),
      ('activity_logs')
    ) as admin_tables(table_name)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = policy_record.table_name
        and policyname = 'Admins can manage records'
    ) then
      execute format(
        'create policy "Admins can manage records" on public.%I for all to authenticated using (public.has_app_role(array[''super_admin'', ''admin'', ''course_manager'', ''mentor_manager'', ''crm_manager'', ''editor''])) with check (public.has_app_role(array[''super_admin'', ''admin'', ''course_manager'', ''mentor_manager'', ''crm_manager'', ''editor'']))',
        policy_record.table_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mentors' and policyname = 'Published mentors are readable'
  ) then
    create policy "Published mentors are readable" on public.mentors for select using (status = 'active');
  end if;
end $$;

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger course_categories_set_updated_at before update on public.course_categories
  for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger mentors_set_updated_at before update on public.mentors
  for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger admin_accounts_set_updated_at before update on public.admin_accounts
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values
  ('course-images', 'course-images', true),
  ('mentor-images', 'mentor-images', true),
  ('success-stories', 'success-stories', true),
  ('admin-profiles', 'admin-profiles', false),
  ('student-profiles', 'student-profiles', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public media buckets are readable'
  ) then
    create policy "Public media buckets are readable" on storage.objects
      for select
      using (bucket_id in ('course-images', 'mentor-images', 'success-stories'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can manage media buckets'
  ) then
    create policy "Admins can manage media buckets" on storage.objects
      for all
      to authenticated
      using (
        bucket_id in ('course-images', 'mentor-images', 'success-stories', 'admin-profiles', 'student-profiles')
        and public.has_app_role(array['super_admin', 'admin', 'course_manager', 'mentor_manager', 'crm_manager', 'editor'])
      )
      with check (
        bucket_id in ('course-images', 'mentor-images', 'success-stories', 'admin-profiles', 'student-profiles')
        and public.has_app_role(array['super_admin', 'admin', 'course_manager', 'mentor_manager', 'crm_manager', 'editor'])
      );
  end if;
end $$;
