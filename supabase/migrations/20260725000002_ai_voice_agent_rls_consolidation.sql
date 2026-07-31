-- =============================================================================
-- Migration: 20260725000002_ai_voice_agent_rls_consolidation.sql
-- Version:   1.0.0
-- Description:
--   Consolidates the agent_* RLS policies created in
--   20260725000001_ai_voice_agent_foundation.sql. The advisor flagged the
--   original policies (separate "admins manage everything" + "customers view
--   own" permissive policies per table) for the same auth_rls_initplan /
--   multiple_permissive_policies issues already fixed project-wide in the
--   Phase 0.7 RLS performance pass -- fixed here immediately rather than
--   letting new debt accumulate. Also adds covering indexes for FKs the
--   performance advisor flagged as unindexed.
-- =============================================================================

BEGIN;

-- agent_conversations
DROP POLICY IF EXISTS "Admins manage all conversations" ON public.agent_conversations;
DROP POLICY IF EXISTS "Customers view own conversations" ON public.agent_conversations;
CREATE POLICY "Select own or admin" ON public.agent_conversations
    FOR SELECT USING ((select public.has_role('admin')) OR profile_id = (select auth.uid()));
CREATE POLICY "Admins write conversations" ON public.agent_conversations
    FOR INSERT WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins update conversations" ON public.agent_conversations
    FOR UPDATE USING ((select public.has_role('admin'))) WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins delete conversations" ON public.agent_conversations
    FOR DELETE USING ((select public.has_role('admin')));

-- agent_messages
DROP POLICY IF EXISTS "Admins manage all messages" ON public.agent_messages;
DROP POLICY IF EXISTS "Customers view own conversation messages" ON public.agent_messages;
CREATE POLICY "Select own or admin" ON public.agent_messages
    FOR SELECT USING (
        (select public.has_role('admin'))
        OR EXISTS (
            SELECT 1 FROM public.agent_conversations c
            WHERE c.id = agent_messages.conversation_id AND c.profile_id = (select auth.uid())
        )
    );
CREATE POLICY "Admins write messages" ON public.agent_messages
    FOR INSERT WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins update messages" ON public.agent_messages
    FOR UPDATE USING ((select public.has_role('admin'))) WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins delete messages" ON public.agent_messages
    FOR DELETE USING ((select public.has_role('admin')));

-- agent_knowledge_documents
DROP POLICY IF EXISTS "Admins manage knowledge documents" ON public.agent_knowledge_documents;
DROP POLICY IF EXISTS "Public read active knowledge documents" ON public.agent_knowledge_documents;
CREATE POLICY "Select active or admin" ON public.agent_knowledge_documents
    FOR SELECT USING ((is_active = true AND deleted_at IS NULL) OR (select public.has_role('admin')));
CREATE POLICY "Admins write knowledge documents" ON public.agent_knowledge_documents
    FOR INSERT WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins update knowledge documents" ON public.agent_knowledge_documents
    FOR UPDATE USING ((select public.has_role('admin'))) WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins delete knowledge documents" ON public.agent_knowledge_documents
    FOR DELETE USING ((select public.has_role('admin')));

-- agent_knowledge_chunks
DROP POLICY IF EXISTS "Admins manage knowledge chunks" ON public.agent_knowledge_chunks;
DROP POLICY IF EXISTS "Public read knowledge chunks" ON public.agent_knowledge_chunks;
CREATE POLICY "Select active or admin" ON public.agent_knowledge_chunks
    FOR SELECT USING (
        (select public.has_role('admin'))
        OR EXISTS (
            SELECT 1 FROM public.agent_knowledge_documents d
            WHERE d.id = agent_knowledge_chunks.document_id AND d.is_active = true AND d.deleted_at IS NULL
        )
    );
CREATE POLICY "Admins write knowledge chunks" ON public.agent_knowledge_chunks
    FOR INSERT WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins update knowledge chunks" ON public.agent_knowledge_chunks
    FOR UPDATE USING ((select public.has_role('admin'))) WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins delete knowledge chunks" ON public.agent_knowledge_chunks
    FOR DELETE USING ((select public.has_role('admin')));

-- agent_customer_memory
DROP POLICY IF EXISTS "Admins manage customer memory" ON public.agent_customer_memory;
DROP POLICY IF EXISTS "Customers view own memory" ON public.agent_customer_memory;
CREATE POLICY "Select own or admin" ON public.agent_customer_memory
    FOR SELECT USING ((select public.has_role('admin')) OR profile_id = (select auth.uid()));
CREATE POLICY "Admins write customer memory" ON public.agent_customer_memory
    FOR INSERT WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins update customer memory" ON public.agent_customer_memory
    FOR UPDATE USING ((select public.has_role('admin'))) WITH CHECK ((select public.has_role('admin')));
CREATE POLICY "Admins delete customer memory" ON public.agent_customer_memory
    FOR DELETE USING ((select public.has_role('admin')));

-- agent_logs
DROP POLICY IF EXISTS "Admins view agent logs" ON public.agent_logs;
CREATE POLICY "Admins view agent logs" ON public.agent_logs
    FOR SELECT USING ((select public.has_role('admin')));

-- Missing covering indexes on new FKs flagged by the performance advisor
CREATE INDEX IF NOT EXISTS idx_agent_conversations_escalated_to ON public.agent_conversations(escalated_to);
CREATE INDEX IF NOT EXISTS idx_agent_customer_memory_last_conversation ON public.agent_customer_memory(last_conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_created_by ON public.agent_knowledge_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_updated_by ON public.agent_knowledge_documents(updated_by);
CREATE INDEX IF NOT EXISTS idx_agent_messages_audio_file ON public.agent_messages(audio_file_id);

COMMIT;
