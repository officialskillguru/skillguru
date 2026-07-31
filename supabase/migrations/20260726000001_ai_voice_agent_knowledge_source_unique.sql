-- =============================================================================
-- Migration: 20260726000001_ai_voice_agent_knowledge_source_unique.sql
-- Version:   1.0.0
-- Description:
--   Adds a real UNIQUE constraint on agent_knowledge_documents(source_table,
--   source_id) so the knowledge-base sync (Phase 2.2) can genuinely upsert
--   (onConflict) instead of relying on app-level check-then-insert logic --
--   the create-mentor incident (BUG-40) already showed that pattern is unsafe
--   under concurrent/retried calls. NULLs (manually-authored documents with no
--   source row) are unaffected: Postgres permits multiple NULL,NULL rows under
--   a UNIQUE constraint.
-- =============================================================================

ALTER TABLE public.agent_knowledge_documents
    ADD CONSTRAINT agent_knowledge_documents_source_unique UNIQUE (source_table, source_id);
