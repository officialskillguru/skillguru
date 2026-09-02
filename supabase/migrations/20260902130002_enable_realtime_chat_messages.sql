-- QA finding (final hardening pass, messaging QA §14): chat_messages was never added to
-- the supabase_realtime publication, so ConversationView's postgres_changes subscription
-- (chat.service.ts subscribeToConversation) has never actually received INSERT events --
-- messages only ever appeared after a manual page reload, for every role, since the
-- messaging feature was first built. Root cause confirmed live: pg_publication_tables
-- showed zero tables in supabase_realtime at all before this migration.
-- Scoped narrowly to chat_messages (the table this specific, now-verified bug is about)
-- rather than broadly enabling realtime project-wide, which would need its own
-- RLS/security review per table.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
-- Verified live in browser: a sent message now appears in the recipient's/sender's own
-- open conversation view immediately, without a manual page reload.

alter publication supabase_realtime add table public.chat_messages;
