-- ============================================================================
-- Purchase-to-class flow: idempotent paid checkout, live class lifecycle,
-- attendance, shared classroom chat, and counsellor course operations.
-- ============================================================================
-- Additive and idempotent. No table, column, row or existing policy is
-- dropped or narrowed. Written for (and verified on) the isolated local
-- Supabase stack used by the end-to-end simulation; it has NOT been applied
-- to the production project. Before applying anywhere that holds real data,
-- check that no order already has two invoices or two completed payments,
-- otherwise the two unique indexes in section 1 will refuse to build.
--
-- 1. Payments
--    complete_paid_order() / fail_paid_order() / mark_order_payment_pending()
--    are the single place a paid order changes state. They lock the order row
--    (SELECT ... FOR UPDATE), so a browser verify call and a provider webhook
--    arriving together, or a double-clicked "Pay", resolve to exactly one
--    completed payment, one enrollment per course and one invoice. Callable
--    by service_role only (Edge Functions); never by a browser session.
--
-- 2. Live classes
--    scheduled -> live -> completed (and scheduled -> cancelled) enforced by a
--    trigger. Only a course mentor or admin can move a class live/completed;
--    course managers (counsellor: courses.update_all) can schedule, edit and
--    cancel. join_live_class() is the only way a student enters a room: it
--    requires an active enrollment and status = 'live', and records
--    attendance through the existing attendance table.
--
-- 3. Counsellor course operations
--    The counsellor role already holds courses.create / courses.update_all /
--    courses.assign_mentor / students.read, but RLS never let it see draft
--    courses, create a course owned by a teacher, set categories, upload a
--    thumbnail, or read enrollments. Those policies are added here, keyed on
--    the permissions (not the role name) like the rest of the schema.
-- ============================================================================

-- ─── 1. Payments ────────────────────────────────────────────────────────────

create unique index if not exists invoices_order_id_unique
  on public.invoices (order_id);

create unique index if not exists payments_one_completed_per_order
  on public.payments (order_id)
  where status = 'completed';

create or replace function public.complete_paid_order(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_signature text default null,
  p_method text default null,
  p_source text default 'verify'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_payment_id uuid;
  v_enrollment_ids uuid[] := '{}';
  v_enrollment_id uuid;
  v_invoice text;
  v_item record;
  v_titles text;
begin
  if p_provider_payment_id is null or length(trim(p_provider_payment_id)) = 0 then
    raise exception 'provider_payment_id_required' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.status = 'completed' then
    select coalesce(array_agg(e.id order by e.created_at), '{}')
      into v_enrollment_ids
      from public.enrollments e
      join public.order_items oi on oi.course_id = e.course_id
     where oi.order_id = p_order_id and e.student_id = v_order.user_id;
    select invoice_number into v_invoice from public.invoices where order_id = p_order_id;
    insert into public.payment_logs (order_id, event, payload)
    values (p_order_id, 'payment.duplicate_confirmation_ignored',
            jsonb_build_object('source', p_source, 'provider_payment_id', p_provider_payment_id));
    return jsonb_build_object(
      'orderId', p_order_id,
      'enrollmentIds', to_jsonb(v_enrollment_ids),
      'invoiceNumber', v_invoice,
      'alreadyCompleted', true
    );
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_not_pending:%', v_order.status using errcode = 'P0001';
  end if;

  -- A "pending" payment attempt for the same provider payment id (bank still
  -- processing) is promoted rather than duplicated.
  update public.payments
     set status = 'completed',
         razorpay_signature = coalesce(p_signature, razorpay_signature),
         method = coalesce(p_method, method),
         updated_at = now()
   where order_id = p_order_id
     and razorpay_payment_id = p_provider_payment_id
     and status = 'pending'
  returning id into v_payment_id;

  if v_payment_id is null then
    insert into public.payments (order_id, amount, provider, provider_id, razorpay_payment_id, razorpay_signature, status, method)
    values (p_order_id, coalesce(v_order.total_amount, 0), p_provider, p_provider_payment_id,
            p_provider_payment_id, p_signature, 'completed', p_method)
    returning id into v_payment_id;
  end if;

  update public.orders set status = 'completed', failure_reason = null, updated_at = now()
   where id = p_order_id;

  for v_item in select course_id from public.order_items where order_id = p_order_id loop
    insert into public.enrollments (student_id, course_id, enrollment_source, status)
    values (v_order.user_id, v_item.course_id, 'purchase', 'active')
    on conflict (student_id, course_id)
      do update set status = 'active', updated_at = now()
    returning id into v_enrollment_id;
    v_enrollment_ids := v_enrollment_ids || v_enrollment_id;
  end loop;

  -- Deterministic per order, so a retried insert can never mint a second number.
  v_invoice := 'SG-INV-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-'
               || upper(substr(replace(p_order_id::text, '-', ''), 1, 8));
  insert into public.invoices (order_id, invoice_number)
  values (p_order_id, v_invoice)
  on conflict (order_id) do nothing;
  select invoice_number into v_invoice from public.invoices where order_id = p_order_id;

  select string_agg(c.title, ', ')
    into v_titles
    from public.order_items oi join public.courses c on c.id = oi.course_id
   where oi.order_id = p_order_id;

  insert into public.notifications (recipient_id, title, message, type, metadata)
  values (
    v_order.user_id,
    'Payment successful',
    format('Payment of ₹%s received for %s. Receipt %s. Your course and class schedule are now in My Learning.',
           to_char(coalesce(v_order.total_amount, 0), 'FM99,99,99,990'), coalesce(v_titles, 'your course'), v_invoice),
    'payment',
    jsonb_build_object('category', 'payment', 'orderId', p_order_id, 'invoiceNumber', v_invoice)
  );

  insert into public.payment_logs (order_id, payment_id, event, payload)
  values (p_order_id, v_payment_id, 'enrollment.created',
          jsonb_build_object('source', p_source, 'enrollmentIds', to_jsonb(v_enrollment_ids), 'invoiceNumber', v_invoice));

  return jsonb_build_object(
    'orderId', p_order_id,
    'enrollmentIds', to_jsonb(v_enrollment_ids),
    'invoiceNumber', v_invoice,
    'alreadyCompleted', false
  );
end;
$$;

create or replace function public.fail_paid_order(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_reason text default null,
  p_code text default null,
  p_method text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  -- A late decline for an order that already succeeded (or already failed)
  -- must never undo it.
  if v_order.status <> 'pending' then
    insert into public.payment_logs (order_id, event, payload)
    values (p_order_id, 'payment.failure_ignored', jsonb_build_object('status', v_order.status, 'code', p_code));
    return jsonb_build_object('orderId', p_order_id, 'status', v_order.status, 'ignored', true);
  end if;

  update public.payments
     set status = 'failed', failure_reason = p_reason, failure_code = p_code,
         method = coalesce(p_method, method), updated_at = now()
   where order_id = p_order_id and razorpay_payment_id = p_provider_payment_id and status = 'pending';
  if not found then
    insert into public.payments (order_id, amount, provider, provider_id, razorpay_payment_id, status, failure_reason, failure_code, method)
    values (p_order_id, coalesce(v_order.total_amount, 0), p_provider, p_provider_payment_id,
            p_provider_payment_id, 'failed', p_reason, p_code, p_method);
  end if;

  update public.orders set status = 'failed', failure_reason = p_reason, updated_at = now()
   where id = p_order_id;

  insert into public.notifications (recipient_id, title, message, type, metadata)
  values (v_order.user_id, 'Payment declined',
          'Your payment could not be completed and you have not been charged. You can retry from the course checkout.',
          'payment', jsonb_build_object('category', 'payment', 'orderId', p_order_id, 'code', p_code));

  insert into public.payment_logs (order_id, event, error, payload)
  values (p_order_id, 'payment.failed', p_reason, jsonb_build_object('code', p_code));

  return jsonb_build_object('orderId', p_order_id, 'status', 'failed', 'ignored', false);
end;
$$;

create or replace function public.mark_order_payment_pending(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_method text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('orderId', p_order_id, 'status', v_order.status, 'ignored', true);
  end if;

  insert into public.payments (order_id, amount, provider, provider_id, razorpay_payment_id, status, method)
  values (p_order_id, coalesce(v_order.total_amount, 0), p_provider, p_provider_payment_id,
          p_provider_payment_id, 'pending', p_method)
  on conflict (razorpay_payment_id) do nothing;

  insert into public.payment_logs (order_id, event, payload)
  values (p_order_id, 'payment.pending', jsonb_build_object('provider_payment_id', p_provider_payment_id));

  return jsonb_build_object('orderId', p_order_id, 'status', 'pending', 'ignored', false);
end;
$$;

revoke all on function public.complete_paid_order(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.fail_paid_order(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_order_payment_pending(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_paid_order(uuid, text, text, text, text, text) to service_role;
grant execute on function public.fail_paid_order(uuid, text, text, text, text, text) to service_role;
grant execute on function public.mark_order_payment_pending(uuid, text, text, text) to service_role;

-- ─── 2. Live classes ────────────────────────────────────────────────────────

alter table public.live_classes
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

comment on column public.live_classes.scheduled_date is 'Class date in India Standard Time (Asia/Kolkata).';
comment on column public.live_classes.start_time is 'Start time in India Standard Time (Asia/Kolkata).';

-- Course managers (counsellor) can see, schedule, edit and cancel classes.
drop policy if exists "live_classes_course_manager_select" on public.live_classes;
create policy "live_classes_course_manager_select" on public.live_classes
  for select using (public.has_permission('courses.update_all'));

drop policy if exists "live_classes_course_manager_insert" on public.live_classes;
create policy "live_classes_course_manager_insert" on public.live_classes
  for insert with check (
    public.has_permission('courses.update_all')
    and (
      exists (select 1 from public.course_mentors cm
              where cm.course_id = live_classes.course_id and cm.mentor_id = live_classes.mentor_id and cm.status = 'active')
      or exists (select 1 from public.courses c
                 where c.id = live_classes.course_id and c.mentor_id = live_classes.mentor_id)
    )
  );

drop policy if exists "live_classes_course_manager_update" on public.live_classes;
create policy "live_classes_course_manager_update" on public.live_classes
  for update using (public.has_permission('courses.update_all'))
  with check (public.has_permission('courses.update_all'));

create or replace function public.enforce_live_class_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'New live classes must start as scheduled.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    if old.status in ('completed', 'cancelled')
       and (new.scheduled_date, new.start_time, new.end_time) is distinct from (old.scheduled_date, old.start_time, old.end_time) then
      raise exception 'A % class cannot be rescheduled.', old.status using errcode = '42501';
    end if;
    return new;
  end if;

  if public.has_role('admin') then
    null; -- admins may correct any status
  elsif (old.status, new.status) in (('scheduled', 'live'), ('live', 'completed')) then
    if not public.is_course_mentor(old.course_id) then
      raise exception 'Only the course teacher can start or end this class.' using errcode = '42501';
    end if;
  elsif (old.status, new.status) = ('scheduled', 'cancelled') then
    null; -- anyone who passed RLS (course mentor or course manager) may cancel
  else
    raise exception 'Live class cannot move from % to %.', old.status, new.status using errcode = '42501';
  end if;

  if new.status = 'live' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and new.ended_at is null then
    new.ended_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists live_classes_enforce_transition on public.live_classes;
create trigger live_classes_enforce_transition
  before insert or update on public.live_classes
  for each row execute function public.enforce_live_class_transition();

-- Notify actively enrolled students (and the assigned teacher, when someone
-- else scheduled the class) about new, live, cancelled or rescheduled classes.
create or replace function public.notify_live_class_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_message text;
  v_when text;
begin
  v_when := to_char(new.scheduled_date, 'DD Mon YYYY') || ', ' || to_char(new.start_time, 'HH12:MI AM') || ' IST';

  if tg_op = 'INSERT' then
    v_title := 'New live class scheduled';
    v_message := format('%s is scheduled for %s.', new.title, v_when);
    if new.created_by is distinct from new.mentor_id then
      insert into public.notifications (recipient_id, title, message, type, metadata)
      values (new.mentor_id, 'Class assigned to you', format('%s has been scheduled for %s.', new.title, v_when),
              'live_class', jsonb_build_object('liveClassId', new.id, 'courseId', new.course_id, 'event', 'assigned'));
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'live' then
      v_title := 'Class is live now';
      v_message := format('%s has started. Join from Live Classes.', new.title);
    elsif new.status = 'cancelled' then
      v_title := 'Class cancelled';
      v_message := format('%s (%s) has been cancelled.', new.title, v_when);
    elsif new.status = 'completed' then
      return new;
    else
      return new;
    end if;
  elsif (new.scheduled_date, new.start_time) is distinct from (old.scheduled_date, old.start_time) then
    v_title := 'Class rescheduled';
    v_message := format('%s is now scheduled for %s.', new.title, v_when);
  else
    return new;
  end if;

  insert into public.notifications (recipient_id, title, message, type, metadata)
  select e.student_id, v_title, v_message, 'live_class',
         jsonb_build_object('liveClassId', new.id, 'courseId', new.course_id, 'event', lower(replace(v_title, ' ', '_')))
    from public.enrollments e
   where e.course_id = new.course_id and e.status = 'active';
  return new;
end;
$$;

drop trigger if exists live_classes_notify_change on public.live_classes;
create trigger live_classes_notify_change
  after insert or update on public.live_classes
  for each row execute function public.notify_live_class_change();

create or replace function public.start_live_class(p_class_id uuid)
returns public.live_classes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.live_classes%rowtype;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select * into v_class from public.live_classes where id = p_class_id for update;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_course_mentor(v_class.course_id) or public.has_role('admin')) then
    raise exception 'Only the course teacher can start this class.' using errcode = '42501';
  end if;
  if v_class.status = 'live' then
    return v_class;
  end if;
  if v_class.status <> 'scheduled' then
    raise exception 'This class is % and cannot be started.', v_class.status using errcode = 'P0001';
  end if;
  if v_class.scheduled_date > v_today then
    raise exception 'This class is scheduled for a later date (%).', to_char(v_class.scheduled_date, 'DD Mon YYYY') using errcode = 'P0001';
  end if;

  update public.live_classes set status = 'live', started_at = now() where id = p_class_id
  returning * into v_class;
  return v_class;
end;
$$;

create or replace function public.end_live_class(p_class_id uuid)
returns public.live_classes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.live_classes%rowtype;
begin
  select * into v_class from public.live_classes where id = p_class_id for update;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_course_mentor(v_class.course_id) or public.has_role('admin')) then
    raise exception 'Only the course teacher can end this class.' using errcode = '42501';
  end if;
  if v_class.status = 'completed' then
    return v_class;
  end if;
  if v_class.status <> 'live' then
    raise exception 'Only a live class can be ended (current status: %).', v_class.status using errcode = 'P0001';
  end if;

  update public.live_classes set status = 'completed', ended_at = now() where id = p_class_id
  returning * into v_class;
  return v_class;
end;
$$;

-- The only way into a class room. Hosts (course mentor/admin) get in without
-- attendance; students need an active enrollment AND a live class.
create or replace function public.join_live_class(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.live_classes%rowtype;
  v_inserted int;
begin
  select * into v_class from public.live_classes where id = p_class_id;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  if public.is_course_mentor(v_class.course_id) or public.has_role('admin') then
    return jsonb_build_object('role', 'host', 'status', v_class.status, 'attendanceRecorded', false);
  end if;

  if not exists (select 1 from public.enrollments e
                 where e.course_id = v_class.course_id and e.student_id = auth.uid() and e.status = 'active') then
    raise exception 'not_enrolled' using errcode = '42501';
  end if;

  if v_class.status <> 'live' then
    raise exception 'class_not_live:%', v_class.status using errcode = 'P0001';
  end if;

  insert into public.attendance (student_id, session_type, session_id, course_id, status, date, notes)
  values (auth.uid(), 'live', v_class.id, v_class.course_id, 'present', v_class.scheduled_date, 'Joined live class room')
  on conflict (student_id, session_id, date) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object('role', 'participant', 'status', v_class.status, 'attendanceRecorded', true, 'firstJoin', v_inserted > 0);
end;
$$;

create or replace function public.get_live_class_roster(p_class_id uuid)
returns table (
  student_id uuid,
  full_name text,
  email text,
  enrolled_at timestamptz,
  attendance_status text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.live_classes%rowtype;
begin
  select * into v_class from public.live_classes where id = p_class_id;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_course_mentor(v_class.course_id) or public.has_role('admin') or public.has_permission('students.read')) then
    raise exception 'You do not have access to this class roster.' using errcode = '42501';
  end if;

  return query
  select e.student_id, p.full_name, p.email, e.enrolled_at, a.status, a.created_at
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    left join public.attendance a on a.session_id = v_class.id and a.student_id = e.student_id
   where e.course_id = v_class.course_id and e.status = 'active'
   order by p.full_name;
end;
$$;

-- Public, non-sensitive schedule for a published course detail page.
create or replace function public.get_public_course_schedule(p_course_id uuid)
returns table (
  id uuid,
  title text,
  scheduled_date date,
  start_time time,
  end_time time,
  status text,
  mentor_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lc.id, lc.title, lc.scheduled_date, lc.start_time, lc.end_time, lc.status, p.full_name
    from public.live_classes lc
    join public.courses c on c.id = lc.course_id
    left join public.profiles p on p.id = lc.mentor_id
   where lc.course_id = p_course_id
     and c.status = 'published' and c.deleted_at is null
     and lc.status <> 'cancelled'
   order by lc.scheduled_date, lc.start_time
   limit 20;
$$;

revoke all on function public.start_live_class(uuid) from public, anon;
revoke all on function public.end_live_class(uuid) from public, anon;
revoke all on function public.join_live_class(uuid) from public, anon;
revoke all on function public.get_live_class_roster(uuid) from public, anon;
grant execute on function public.start_live_class(uuid) to authenticated;
grant execute on function public.end_live_class(uuid) to authenticated;
grant execute on function public.join_live_class(uuid) to authenticated;
grant execute on function public.get_live_class_roster(uuid) to authenticated;
grant execute on function public.get_public_course_schedule(uuid) to anon, authenticated;

-- Shared classroom chat (replaces the per-browser demo chat).
create table if not exists public.live_class_messages (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists live_class_messages_class_idx on public.live_class_messages (live_class_id, created_at);

alter table public.live_class_messages enable row level security;

create or replace function public.can_access_live_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.live_classes lc
     where lc.id = p_class_id
       and (
         public.has_role('admin')
         or public.is_course_mentor(lc.course_id)
         or (lc.status in ('live', 'completed') and exists (
               select 1 from public.enrollments e
                where e.course_id = lc.course_id and e.student_id = auth.uid() and e.status = 'active'))
       )
  );
$$;
revoke all on function public.can_access_live_class(uuid) from public, anon;
grant execute on function public.can_access_live_class(uuid) to authenticated;

drop policy if exists "live_class_messages_select" on public.live_class_messages;
create policy "live_class_messages_select" on public.live_class_messages
  for select using (public.can_access_live_class(live_class_id));

drop policy if exists "live_class_messages_insert" on public.live_class_messages;
create policy "live_class_messages_insert" on public.live_class_messages
  for insert with check (
    author_id = auth.uid()
    and public.can_access_live_class(live_class_id)
    and exists (select 1 from public.live_classes lc where lc.id = live_class_id and lc.status = 'live')
  );

grant select, insert on public.live_class_messages to authenticated;

-- ─── 3. Counsellor (course manager) access ──────────────────────────────────

-- 20260902110001 granted the counsellor courses.create / courses.update_all by
-- joining on existing permission rows, but on a database built from the
-- migration history those rows are (re)created later by 20261116000003, so
-- the grant silently matched nothing. Re-apply the documented intent;
-- a no-op where the rows already exist.
insert into public.role_permissions (role_id, permission_id, is_active)
select r.id, p.id, true
  from public.roles r
  join public.permissions p on p.slug in ('courses.create', 'courses.update_all', 'courses.assign_mentor', 'categories.propose')
 where r.code = 'counsellor'
   and not exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);

drop policy if exists "courses_select_course_managers" on public.courses;
create policy "courses_select_course_managers" on public.courses
  for select using (public.has_permission('courses.update_all') and deleted_at is null);

drop policy if exists "courses_insert_course_managers" on public.courses;
create policy "courses_insert_course_managers" on public.courses
  for insert with check (public.has_permission('courses.create') and public.has_permission('courses.update_all'));

drop policy if exists "course_categories_course_managers" on public.course_categories;
create policy "course_categories_course_managers" on public.course_categories
  for all using (public.has_permission('courses.update_all'))
  with check (public.has_permission('courses.update_all'));

drop policy if exists "files_select_course_media_course_managers" on public.files;
create policy "files_select_course_media_course_managers" on public.files
  for select using (bucket = 'courses' and deleted_at is null and public.has_permission('courses.update_all'));

drop policy if exists "courses: read (course managers)" on storage.objects;
create policy "courses: read (course managers)" on storage.objects
  for select using (bucket_id = 'courses' and public.has_permission('courses.update_all'));

drop policy if exists "courses: insert (course managers)" on storage.objects;
create policy "courses: insert (course managers)" on storage.objects
  for insert with check (bucket_id = 'courses' and public.has_permission('courses.update_all'));

drop policy if exists "courses: update (course managers)" on storage.objects;
create policy "courses: update (course managers)" on storage.objects
  for update using (bucket_id = 'courses' and public.has_permission('courses.update_all'))
  with check (bucket_id = 'courses' and public.has_permission('courses.update_all'));

drop policy if exists "enrollments_select_student_readers" on public.enrollments;
create policy "enrollments_select_student_readers" on public.enrollments
  for select using (public.has_permission('students.read'));

-- Enrollment + payment outcome per student for one course, for the
-- counsellor's course review screen. Exposes order status/amount/receipt
-- number only - never signatures or provider payloads.
create or replace function public.get_course_purchase_overview(p_course_id uuid)
returns table (
  student_id uuid,
  full_name text,
  email text,
  enrollment_status text,
  enrollment_source text,
  enrolled_at timestamptz,
  order_id uuid,
  order_status text,
  amount numeric,
  payment_method text,
  invoice_number text,
  ordered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.has_role('admin') or public.has_permission('students.read')) then
    raise exception 'You do not have access to enrollment data.' using errcode = '42501';
  end if;

  return query
  with course_orders as (
    select distinct on (o.user_id)
           o.user_id, o.id, o.status, o.total_amount, o.created_at
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
     where oi.course_id = p_course_id
     order by o.user_id, (o.status = 'completed') desc, o.created_at desc
  ),
  people as (
    select e.student_id as uid from public.enrollments e where e.course_id = p_course_id
    union
    select co.user_id from course_orders co
  )
  select pe.uid, pr.full_name, pr.email,
         e.status::text, e.enrollment_source::text, e.enrolled_at,
         co.id, co.status, co.total_amount,
         (select pay.method from public.payments pay where pay.order_id = co.id order by (pay.status = 'completed') desc, pay.created_at desc limit 1),
         (select i.invoice_number from public.invoices i where i.order_id = co.id),
         co.created_at
    from people pe
    join public.profiles pr on pr.id = pe.uid
    left join public.enrollments e on e.course_id = p_course_id and e.student_id = pe.uid
    left join course_orders co on co.user_id = pe.uid
   order by coalesce(co.created_at, e.enrolled_at) desc nulls last;
end;
$$;
revoke all on function public.get_course_purchase_overview(uuid) from public, anon;
grant execute on function public.get_course_purchase_overview(uuid) to authenticated;
