-- ==============================================================================
-- 002_enums.sql
-- All PostgreSQL Enum Types for SkillGuru
-- ==============================================================================
--
-- WHY: Enums enforce valid state transitions at the database level. A course
--      cannot have status = 'banana'. This is cheaper than CHECK constraints
--      on text columns and provides better documentation of allowed values.
--
-- SAFE: Uses DO blocks with exception handling. Re-running this migration
--       will not fail if enums already exist.
--
-- ADDING VALUES LATER: Use ALTER TYPE ... ADD VALUE. Enum values can be
--       added but never removed in PostgreSQL. Plan values carefully.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- Identity Domain
-- ---------------------------------------------------------------------------

-- Organization lifecycle
DO $$ BEGIN
    CREATE TYPE org_status AS ENUM ('active', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Content Domain
-- ---------------------------------------------------------------------------

-- Course publication lifecycle
DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'under_review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Course difficulty level
DO $$ BEGIN
    CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lesson content format
DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('video', 'text', 'pdf', 'quiz', 'assignment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Video processing pipeline status
DO $$ BEGIN
    CREATE TYPE video_status AS ENUM ('pending', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Commerce Domain
-- ---------------------------------------------------------------------------

-- Course pricing model
DO $$ BEGIN
    CREATE TYPE pricing_type AS ENUM ('free', 'one_time', 'subscription');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Order lifecycle
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment attempt lifecycle
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('initiated', 'processing', 'succeeded', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Student enrollment lifecycle
DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- How the enrollment was granted
DO $$ BEGIN
    CREATE TYPE enrollment_source AS ENUM ('purchase', 'admin_grant', 'coupon', 'gift', 'subscription');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Learning Domain
-- ---------------------------------------------------------------------------

-- Course completion lifecycle
DO $$ BEGIN
    CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Quiz question format
DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('mcq', 'multi_select', 'true_false', 'short_answer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Engagement Domain
-- ---------------------------------------------------------------------------

-- Notification delivery channel
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification urgency
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification delivery tracking
DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- System Domain
-- ---------------------------------------------------------------------------

-- File safety scanning
DO $$ BEGIN
    CREATE TYPE virus_scan_status AS ENUM ('pending', 'clean', 'infected', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit log severity for production debugging
DO $$ BEGIN
    CREATE TYPE audit_severity AS ENUM ('info', 'warning', 'error', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Phase B Enums (defined now to avoid future migration conflicts)
-- ---------------------------------------------------------------------------

-- Blog publication lifecycle
DO $$ BEGIN
    CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Support ticket lifecycle
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Support ticket urgency
DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mentor payout lifecycle
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
