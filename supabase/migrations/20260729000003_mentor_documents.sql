-- Enterprise Mentor Management Phase 3: mentor document management (resume,
-- certificates, agreements, identity documents, portfolio) with version
-- history. Reuses the existing `files` table for actual storage metadata and
-- the existing private `admins` storage bucket (already admin-only via its
-- "Admin only access to admin bucket" RLS policy, unconditional on folder) —
-- no new bucket, no new storage RLS needed.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mentor_documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id       uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    file_id         uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    document_type   text NOT NULL CHECK (document_type IN ('resume','certificate','agreement','identity','portfolio','other')),
    version         int NOT NULL DEFAULT 1,
    is_current      boolean NOT NULL DEFAULT true,
    uploaded_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mentor_documents_mentor ON public.mentor_documents(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_documents_type ON public.mentor_documents(mentor_id, document_type);
CREATE INDEX IF NOT EXISTS idx_mentor_documents_current ON public.mentor_documents(mentor_id, document_type, is_current) WHERE is_current = true;

ALTER TABLE public.mentor_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mentor documents" ON public.mentor_documents FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

COMMIT;
