-- Real bug found during Enterprise Mentor Management Phase 3 live verification:
-- `notifications` has only a "Users view own notifications" SELECT policy
-- (recipient_id = auth.uid()). Postgres RLS requires an INSERT ... RETURNING
-- to also satisfy the table's SELECT policy for the returned row — and
-- notificationsService.sendNotification() (used throughout the app: task
-- assignment, meeting scheduling, bulk notify, admin broadcast) always does
-- `.insert().select().single()`. Since the recipient is virtually never the
-- admin themselves, every admin-initiated notification to someone else has
-- been silently failing with 42501 the whole time this function existed.
-- Additive fix: admins can already write any notification (existing INSERT
-- policy); now they can also read any notification, which is what the
-- RETURNING clause of their own inserts actually needs.

ALTER POLICY "Users view own notifications" ON public.notifications
    USING (recipient_id = (select auth.uid()) OR public.has_role('admin') OR public.has_role('super_admin'));
