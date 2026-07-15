create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'counsellor', 'sales', 'content_manager');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'converted', 'closed');
create type public.learning_mode as enum ('online', 'classroom', 'hybrid');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.app_role not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.course_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  summary text not null,
  description text not null,
  duration text,
  mode public.learning_mode not null default 'online',
  price_inr integer,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text not null unique,
  designation text not null,
  bio text not null,
  photo_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  quote text not null,
  rating integer check (rating between 1 and 5),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.success_stories (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text not null unique,
  story text not null,
  outcome text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.blog_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  source text not null,
  status public.lead_status not null default 'new',
  course_slug text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  course_slug text not null,
  preferred_mode public.learning_mode,
  message text,
  created_at timestamptz not null default now()
);

create table public.counselling_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  career_stage text not null,
  current_role text,
  goals text not null,
  preferred_date date not null,
  preferred_time time not null,
  created_at timestamptz not null default now()
);

create table public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  course_slug text not null,
  preferred_date date not null,
  preferred_time time not null,
  learning_mode public.learning_mode not null,
  created_at timestamptz not null default now()
);

create table public.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null,
  description text not null,
  no_index boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.faculty enable row level security;
alter table public.testimonials enable row level security;
alter table public.success_stories enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.events enable row level security;
alter table public.leads enable row level security;
alter table public.enquiries enable row level security;
alter table public.counselling_bookings enable row level security;
alter table public.demo_bookings enable row level security;
alter table public.seo_metadata enable row level security;
alter table public.audit_logs enable row level security;

create policy "Published courses are readable" on public.courses for select using (is_published = true);
create policy "Published faculty are readable" on public.faculty for select using (is_published = true);
create policy "Published testimonials are readable" on public.testimonials for select using (is_published = true);
create policy "Published success stories are readable" on public.success_stories for select using (is_published = true);
create policy "Published blog posts are readable" on public.blog_posts for select using (is_published = true);
create policy "Published events are readable" on public.events for select using (is_published = true);

create index leads_email_idx on public.leads(email);
create index leads_status_idx on public.leads(status);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
