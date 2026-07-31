-- =============================================================================
-- Migration: 20260718000009_scheduling.sql
-- Version:   1.0.0
-- Description:
--   Creates scheduling and calendar tables: calendars, calendar_events, availability.
--   These tables are generic and can be used by mentors, admins, and students.
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Calendars
-- ============================================================================
DROP TABLE IF EXISTS public.calendars CASCADE;
CREATE TABLE public.calendars (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name                    text NOT NULL DEFAULT 'Primary Calendar',
    description             text,
    color                   text DEFAULT '#3b82f6',
    timezone                text NOT NULL DEFAULT 'UTC',
    is_default              boolean NOT NULL DEFAULT false,
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_calendars_user ON public.calendars(user_id);
-- Ensure only one default calendar per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendars_default_unique 
    ON public.calendars(user_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.calendars;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.calendars
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own calendars" ON public.calendars FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Users manage own calendars" ON public.calendars FOR ALL
    USING (user_id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin'));


-- ============================================================================
-- SECTION 2: Calendar Events
-- ============================================================================
DROP TABLE IF EXISTS public.calendar_events CASCADE;
CREATE TABLE public.calendar_events (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id             uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
    title                   text NOT NULL,
    description             text,
    location                text,
    meeting_url             text,
    
    starts_at               timestamptz NOT NULL,
    ends_at                 timestamptz NOT NULL,
    is_all_day              boolean NOT NULL DEFAULT false,
    
    status                  text NOT NULL DEFAULT 'confirmed'
                            CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
    
    is_recurring            boolean NOT NULL DEFAULT false,
    recurrence_rule         text, -- iCal RRULE
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz,
    
    CONSTRAINT ends_after_starts CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts ON public.calendar_events(starts_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.calendar_events;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view events on own calendars" ON public.calendar_events FOR SELECT
    USING (
        calendar_id IN (SELECT id FROM public.calendars WHERE user_id = auth.uid())
        OR public.has_role('super_admin') OR public.has_role('admin')
    );
CREATE POLICY "Users manage events on own calendars" ON public.calendar_events FOR ALL
    USING (
        calendar_id IN (SELECT id FROM public.calendars WHERE user_id = auth.uid())
        OR public.has_role('super_admin') OR public.has_role('admin')
    );


-- ============================================================================
-- SECTION 3: Availability
-- ============================================================================
DROP TABLE IF EXISTS public.availability CASCADE;
CREATE TABLE public.availability (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week             int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time              time NOT NULL, -- e.g., '09:00:00'
    end_time                time NOT NULL, -- e.g., '17:00:00'
    timezone                text NOT NULL DEFAULT 'UTC',
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz,
    
    CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_user ON public.availability(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON public.availability(day_of_week);

DROP TRIGGER IF EXISTS set_updated_at ON public.availability;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.availability
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views availability" ON public.availability FOR SELECT
    USING (is_active = true OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Users manage own availability" ON public.availability FOR ALL
    USING (user_id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin'));


COMMIT;
