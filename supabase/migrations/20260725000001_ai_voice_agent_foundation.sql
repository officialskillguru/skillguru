-- =============================================================================
-- Migration: 20260725000001_ai_voice_agent_foundation.sql
-- Version:   1.0.0
-- Description:
--   Foundation schema for the AI Voice Sales Agent (Phase 2 of the Vision 2026
--   roadmap: AIProvider abstraction + n8n automation layer). This migration is
--   purely additive -- new tables plus new nullable columns on the existing
--   `leads` table -- and does not touch or duplicate the existing CRM schema
--   (leads/lead_activities/pipeline_*) or notifications system.
--
--   Adds:
--     1. pgvector extension (for semantic/RAG search)
--     2. agent_conversations   -- one row per voice/chat session
--     3. agent_messages        -- one row per conversational turn
--     4. agent_knowledge_documents / agent_knowledge_chunks -- RAG corpus
--     5. agent_customer_memory -- long-term per-customer memory
--     6. agent_logs            -- structured action/API/workflow logs
--     7. Lead-qualification columns added to the existing `leads` table
--     8. match_agent_knowledge() -- semantic search RPC over the RAG corpus
--
--   Explicitly NOT duplicated: appointments reuse the existing `meetings`
--   table (entity_type='agent_conversation'); lead storage reuses the
--   existing `leads`/`lead_activities` tables; outbound notifications reuse
--   the existing `notifications` table/service.
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- SECTION 2: Agent Conversations
-- ============================================================================
-- WHY: One row per voice or chat session with a visitor. `visitor_id` is a
--      client-generated UUID for anonymous visitors before any lead/profile
--      exists; `profile_id`/`lead_id` are populated once identity/lead
--      capture happens mid-conversation.
CREATE TABLE IF NOT EXISTS public.agent_conversations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id          uuid NOT NULL,
    profile_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_id             uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    channel             text NOT NULL DEFAULT 'voice' CHECK (channel IN ('voice', 'chat')),
    status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'escalated')),
    intent              text,
    summary             text,
    drop_off_stage       text,
    escalated_to         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    escalated_at         timestamptz,
    started_at          timestamptz NOT NULL DEFAULT now(),
    ended_at            timestamptz,
    duration_seconds    int,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_visitor ON public.agent_conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_profile ON public.agent_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_lead ON public.agent_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_status ON public.agent_conversations(status);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_started ON public.agent_conversations(started_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.agent_conversations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agent_conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.agent_conversations IS 'One row per AI voice/chat sales-agent session. Links to leads/profiles once identity is captured mid-conversation.';

-- ============================================================================
-- SECTION 3: Agent Messages
-- ============================================================================
-- WHY: One row per conversational turn. `audio_file_id` references the
--      existing `files` table (same storage pattern used for avatars/lesson
--      videos) rather than inventing a parallel audio-storage mechanism.
CREATE TABLE IF NOT EXISTS public.agent_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
    role                text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
    content             text NOT NULL,
    audio_file_id       uuid REFERENCES public.files(id) ON DELETE SET NULL,
    intent              text,
    function_call       jsonb,
    citations           jsonb NOT NULL DEFAULT '[]'::jsonb,
    tokens_used         int,
    latency_ms          int,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON public.agent_messages(conversation_id, created_at);

COMMENT ON TABLE public.agent_messages IS 'One row per turn in an agent_conversations session. citations references agent_knowledge_chunks.id values used to ground the response.';

-- ============================================================================
-- SECTION 4: Knowledge Base (RAG corpus)
-- ============================================================================
-- WHY: Source documents (courses, FAQs, policies, manually-authored content)
--      are chunked and embedded separately so re-chunking/re-embedding never
--      requires re-ingesting the source. `source_table`/`source_id` optionally
--      point back at a real row (e.g. courses.id) for documents ingested from
--      existing data rather than authored manually.
CREATE TABLE IF NOT EXISTS public.agent_knowledge_documents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title               text NOT NULL,
    category            text NOT NULL CHECK (category IN ('course', 'pricing', 'faq', 'policy', 'mentor', 'testimonial', 'general')),
    content             text NOT NULL,
    source_table        text,
    source_id           uuid,
    is_active           boolean NOT NULL DEFAULT true,
    version             int NOT NULL DEFAULT 1,
    created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_category ON public.agent_knowledge_documents(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_source ON public.agent_knowledge_documents(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_documents_active ON public.agent_knowledge_documents(is_active) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON public.agent_knowledge_documents;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agent_knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.agent_knowledge_documents IS 'RAG source documents. source_table/source_id optionally point at the real row this was ingested from (e.g. courses.id) for incremental re-sync.';

-- Embedding dimension: 768, matching Gemini's text-embedding-004 /
-- gemini-embedding-001 default output size. If a different embedding model
-- or output dimensionality is used, this column must be migrated to match --
-- it is not auto-detected.
CREATE TABLE IF NOT EXISTS public.agent_knowledge_chunks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES public.agent_knowledge_documents(id) ON DELETE CASCADE,
    chunk_index         int NOT NULL,
    content             text NOT NULL,
    token_count         int,
    embedding           vector(768),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_chunks_document ON public.agent_knowledge_chunks(document_id);
-- HNSW is used over IVFFlat: no training/list-count tuning required and it
-- performs well without a large pre-existing corpus (IVFFlat needs enough
-- rows to build meaningful clusters, which this corpus won't have at launch).
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_chunks_embedding ON public.agent_knowledge_chunks
    USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE public.agent_knowledge_chunks IS 'Chunked + embedded RAG corpus. embedding is vector(768) (Gemini text-embedding-004 dimensionality) -- must be migrated if the embedding model changes.';

-- ============================================================================
-- SECTION 5: Customer Memory (long-term)
-- ============================================================================
-- WHY: One row per profile holding cross-conversation memory (preferences,
--      running summary, interaction counters) so the agent can reference
--      prior conversations without re-reading full transcripts every time.
CREATE TABLE IF NOT EXISTS public.agent_customer_memory (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id              uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferred_courses       uuid[] NOT NULL DEFAULT '{}',
    preferences             jsonb NOT NULL DEFAULT '{}'::jsonb,
    interaction_summary     text,
    total_conversations     int NOT NULL DEFAULT 0,
    last_conversation_id    uuid REFERENCES public.agent_conversations(id) ON DELETE SET NULL,
    last_interaction_at     timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_customer_memory_profile ON public.agent_customer_memory(profile_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.agent_customer_memory;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.agent_customer_memory
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.agent_customer_memory IS 'Long-term per-customer memory the agent reads at conversation start and updates at conversation end.';

-- ============================================================================
-- SECTION 6: Agent Logs (structured, for observability)
-- ============================================================================
-- WHY: Separate from public.audit_logs (which tracks admin/business actions
--      on business entities) -- this tracks agent-internal events (API calls,
--      workflow steps, retries, failures) for debugging and monitoring, at a
--      volume/shape that shouldn't pollute the business audit trail.
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
    event_type          text NOT NULL,
    level               text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    source              text NOT NULL,
    payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id          text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation ON public.agent_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON public.agent_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON public.agent_logs(created_at DESC);

COMMENT ON TABLE public.agent_logs IS 'Structured internal logs for the AI agent pipeline (API calls, workflow steps, retries, failures). Not the business audit trail -- see public.audit_logs for that.';

-- ============================================================================
-- SECTION 7: Lead qualification columns (extends the existing `leads` table)
-- ============================================================================
-- WHY: The agent's lead-qualification flow needs several fields the existing
--      CRM schema doesn't carry. All additive/nullable -- zero impact on the
--      existing CRM UI/service, which simply won't populate these columns.
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS city                text,
    ADD COLUMN IF NOT EXISTS country              text,
    ADD COLUMN IF NOT EXISTS education            text,
    ADD COLUMN IF NOT EXISTS experience_years     numeric(4,1),
    ADD COLUMN IF NOT EXISTS career_goal          text,
    ADD COLUMN IF NOT EXISTS timeline             text,
    ADD COLUMN IF NOT EXISTS learning_mode        text CHECK (learning_mode IS NULL OR learning_mode IN ('online', 'offline', 'hybrid')),
    ADD COLUMN IF NOT EXISTS urgency              text CHECK (urgency IS NULL OR urgency IN ('low', 'medium', 'high')),
    ADD COLUMN IF NOT EXISTS lead_score           int CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100)),
    ADD COLUMN IF NOT EXISTS agent_conversation_id uuid REFERENCES public.agent_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_agent_conversation ON public.leads(agent_conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score DESC) WHERE lead_score IS NOT NULL;

COMMENT ON COLUMN public.leads.lead_score IS '0-100, computed by the agent lead-scoring logic. NULL = not yet scored (e.g. leads created via other channels).';
COMMENT ON COLUMN public.leads.agent_conversation_id IS 'Set when this lead originated from (or was updated during) an AI agent conversation.';

-- ============================================================================
-- SECTION 8: Semantic search RPC
-- ============================================================================
-- WHY: A single, real, callable RPC for the RAG retrieval step -- cosine
--      similarity search over agent_knowledge_chunks with an optional
--      category filter and similarity threshold, returning the parent
--      document's title/category for citation display.
CREATE OR REPLACE FUNCTION public.match_agent_knowledge(
    query_embedding vector(768),
    match_count int DEFAULT 5,
    similarity_threshold float DEFAULT 0.7,
    filter_category text DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    document_title text,
    document_category text,
    content text,
    similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        c.id AS chunk_id,
        d.id AS document_id,
        d.title AS document_title,
        d.category AS document_category,
        c.content,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.agent_knowledge_chunks c
    JOIN public.agent_knowledge_documents d ON d.id = c.document_id
    WHERE d.is_active = true
      AND d.deleted_at IS NULL
      AND (filter_category IS NULL OR d.category = filter_category)
      AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_agent_knowledge IS 'Cosine-similarity semantic search over the RAG corpus. Callable via supabase-js .rpc(''match_agent_knowledge'', {...}). SECURITY DEFINER is safe here: read-only, no user-supplied SQL, filters to is_active/non-deleted documents only.';

GRANT EXECUTE ON FUNCTION public.match_agent_knowledge TO authenticated, anon, service_role;

-- ============================================================================
-- SECTION 9: Row Level Security
-- ============================================================================
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_customer_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Conversations: admins see everything; a signed-in customer sees their own;
-- anonymous visitors have no direct table access at all (the anon/public
-- website talks to the agent exclusively through the edge function / n8n
-- webhook layer, which uses the service role -- there is deliberately no
-- public INSERT/SELECT policy here).
CREATE POLICY "Admins manage all conversations" ON public.agent_conversations
    FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Customers view own conversations" ON public.agent_conversations
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins manage all messages" ON public.agent_messages
    FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Customers view own conversation messages" ON public.agent_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agent_conversations c
            WHERE c.id = agent_messages.conversation_id AND c.profile_id = auth.uid()
        )
    );

-- Knowledge base: admins manage; everyone (including anon, for the public
-- marketing site's own use of the corpus if ever needed) can read active docs.
CREATE POLICY "Admins manage knowledge documents" ON public.agent_knowledge_documents
    FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Public read active knowledge documents" ON public.agent_knowledge_documents
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admins manage knowledge chunks" ON public.agent_knowledge_chunks
    FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Public read knowledge chunks" ON public.agent_knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agent_knowledge_documents d
            WHERE d.id = agent_knowledge_chunks.document_id AND d.is_active = true AND d.deleted_at IS NULL
        )
    );

-- Customer memory: admins manage; customers can view (never write) their own.
CREATE POLICY "Admins manage customer memory" ON public.agent_customer_memory
    FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Customers view own memory" ON public.agent_customer_memory
    FOR SELECT USING (profile_id = auth.uid());

-- Logs: admin-only, no customer access at all.
CREATE POLICY "Admins view agent logs" ON public.agent_logs
    FOR SELECT USING (public.has_role('admin'));

COMMIT;
