do $$
begin
  create type public.portal_role as enum ('student', 'mentor', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.portal_role not null,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists education text;

alter table public.mentors
  add column if not exists resume_url text,
  add column if not exists approved_by uuid references public.admin_accounts(id) on delete set null,
  add column if not exists approved_at timestamptz;

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'admin',
  status public.account_status not null default 'active',
  last_login timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admins enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile" on public.profiles
      for select to authenticated
      using (id = auth.uid() or public.has_app_role(array['super_admin', 'admin', 'crm_manager', 'mentor_manager']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile" on public.profiles
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can manage profiles'
  ) then
    create policy "Admins can manage profiles" on public.profiles
      for all to authenticated
      using (public.has_app_role(array['super_admin', 'admin', 'crm_manager', 'mentor_manager']))
      with check (public.has_app_role(array['super_admin', 'admin', 'crm_manager', 'mentor_manager']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'students' and policyname = 'Students can manage own record'
  ) then
    create policy "Students can manage own record" on public.students
      for all to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mentors' and policyname = 'Mentors can read own pending record'
  ) then
    create policy "Mentors can read own pending record" on public.mentors
      for select to authenticated
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mentors' and policyname = 'Mentors can update own profile'
  ) then
    create policy "Mentors can update own profile" on public.mentors
      for update to authenticated
      using (id = auth.uid() and status in ('active', 'approved'))
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admins' and policyname = 'Super admins manage admins'
  ) then
    create policy "Super admins manage admins" on public.admins
      for all to authenticated
      using (public.has_app_role(array['super_admin']))
      with check (public.has_app_role(array['super_admin']));
  end if;
end $$;

create or replace function public.sync_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set status = new.status,
      updated_at = now()
  where id = new.id;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('status', new.status)
  where id = new.id;

  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  requested_status text := coalesce(new.raw_user_meta_data->>'status', case when requested_role = 'mentor' then 'pending' else 'active' end);
  full_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
begin
  if requested_role not in ('student', 'mentor', 'admin') then
    requested_role := 'student';
  end if;

  if requested_role = 'admin' and not (new.raw_app_meta_data ? 'created_by_super_admin') then
    raise exception 'Public admin registration is disabled';
  end if;

  insert into public.profiles (id, email, role, status)
  values (new.id, new.email, requested_role::public.portal_role, requested_status::public.account_status)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        status = excluded.status,
        updated_at = now();

  insert into public.users (id, full_name, email, phone)
  values (new.id, full_name, new.email, new.raw_user_meta_data->>'phone')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone,
        updated_at = now();

  if requested_role = 'student' then
    insert into public.students (id, name, email, phone, city, state, education, status)
    values (
      new.id,
      full_name,
      new.email,
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'city',
      new.raw_user_meta_data->>'state',
      new.raw_user_meta_data->>'education',
      requested_status::public.account_status
    )
    on conflict (id) do nothing;
  elsif requested_role = 'mentor' then
    insert into public.mentors (id, name, email, phone, designation, bio, experience_years, linkedin_url, skills, status)
    values (
      new.id,
      full_name,
      new.email,
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'designation', 'Mentor'),
      coalesce(new.raw_user_meta_data->>'designation', 'Mentor'),
      coalesce((new.raw_user_meta_data->>'experience_years')::integer, 0),
      new.raw_user_meta_data->>'linkedin_url',
      case
        when jsonb_typeof(new.raw_user_meta_data->'skills') = 'array'
          then array(select jsonb_array_elements_text(new.raw_user_meta_data->'skills'))
        else '{}'
      end,
      requested_status::public.account_status
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists mentors_sync_profile_status on public.mentors;
create trigger mentors_sync_profile_status after update of status on public.mentors
  for each row execute function public.sync_profile_status();

insert into storage.buckets (id, name, public)
values
  ('mentor-profiles', 'mentor-profiles', false),
  ('mentor-resumes', 'mentor-resumes', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can manage own profile files'
  ) then
    create policy "Users can manage own profile files" on storage.objects
      for all to authenticated
      using (
        bucket_id in ('student-profiles', 'mentor-profiles', 'mentor-resumes', 'admin-profiles')
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id in ('student-profiles', 'mentor-profiles', 'mentor-resumes', 'admin-profiles')
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
