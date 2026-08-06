import { getExtendedSupabaseClient } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================
export interface Conversation {
  id: string;
  type: string;
  title: string | null;
  created_by: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  members?: ConversationMember[];
  last_message?: ChatMessage | null;
  unread_count?: number;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id: string | null;
  is_deleted: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: {
    id: string;
    full_name: string;
  } | null;
  attachments?: MessageAttachment[];
  reply_to?: Pick<ChatMessage, "id" | "content" | "sender_id"> | null;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  storage_path: string;
  url: string | null;
}

// ============================================================================
// Chat Service
// ============================================================================
export const chatService = {
  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------
  async listConversations(): Promise<Result<Conversation[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));

      const { data, error } = await supabase
        .from("conversation_members")
        .select(`
          conversation:conversations(
            *,
            members:conversation_members(
              *,
              user:profiles(id, full_name, email)
            )
          )
        `)
        .eq("user_id", user.id)
        .order("updated_at", { referencedTable: "conversations", ascending: false });

      if (error) return fail(new DatabaseError(error.message, error.code));

      const conversations = data
        ?.map((d: unknown) => (d as { conversation: Conversation }).conversation)
        .filter(Boolean) ?? [];

      // Bounded extra query (one, regardless of conversation count) for a
      // last-message preview - not embeddable via a plain PostgREST nested
      // select since that would need a "top 1 per group" query shape.
      if (conversations.length > 0) {
        const { data: recentMessages } = await supabase
          .from("chat_messages")
          .select("*, sender:profiles!chat_messages_sender_id_fkey(id, full_name)")
          .in("conversation_id", conversations.map((c) => c.id))
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

        const lastByConversation = new Map<string, ChatMessage>();
        for (const message of (recentMessages as unknown as ChatMessage[]) ?? []) {
          if (!lastByConversation.has(message.conversation_id)) {
            lastByConversation.set(message.conversation_id, message);
          }
        }
        for (const conv of conversations) {
          conv.last_message = lastByConversation.get(conv.id) ?? null;
        }
      }

      return ok(conversations);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_conversations_list"));
    }
  },

  /**
   * @deprecated Group conversations share the exact RLS gap that
   * getOrCreateDirectConversation() had (removed - see startAuthorizedDirectConversation()
   * below): conversation_members' INSERT policy only allows a self-row for any
   * non-admin caller, so the memberIds.map(...) insert below silently fails
   * for every member row except the caller's own for any non-admin. Zero call
   * sites exist anywhere in the app today (group chat is not part of the
   * Phase C/D messaging scope). Left in place rather than deleted because
   * group conversations may be a legitimate future feature, but it must NOT
   * be wired into any UI until an authorized RPC (mirroring
   * start_direct_conversation) is built for it.
   */
  async createGroupConversation(title: string, memberIds: string[]): Promise<Result<Conversation>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));

      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({ type: "group", title, created_by: user.id } as never)
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));

      const allMembers = [...new Set([user.id, ...memberIds])];
      await supabase.from("conversation_members").insert(
        allMembers.map((uid) => ({
          conversation_id: (conv as Conversation).id,
          user_id: uid,
          role: uid === user.id ? "admin" : "member",
        }))
      );

      return ok(conv as Conversation);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_group_create"));
    }
  },

  // --------------------------------------------------------------------------
  // Messages
  // --------------------------------------------------------------------------
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Result<ChatMessage[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      let query = supabase
        .from("chat_messages")
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name),
          attachments:message_attachments(*),
          reply_to:chat_messages!chat_messages_reply_to_id_fkey(id, content, sender_id)
        `)
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data, error } = await query;
      if (error) return fail(new DatabaseError(error.message, error.code));

      // Return in chronological order
      return ok(((data as unknown as ChatMessage[]) ?? []).reverse());
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_messages_get"));
    }
  },

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: ChatMessage["message_type"] = "text",
    replyToId?: string
  ): Promise<Result<ChatMessage>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          ...(replyToId && { reply_to_id: replyToId }),
        } as never)
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name)
        `)
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() } as never)
        .eq("id", conversationId);

      // Non-fatal: the message itself already sent successfully. The RPC
      // self-validates conversation membership and dedupes against an
      // already-unread notification for the same conversation.
      try {
        const { error: notifyError } = await supabase.rpc("notify_new_message", {
          p_conversation_id: conversationId,
          p_message_preview: content,
        });
        if (notifyError) console.error("Failed to notify recipient of new message", notifyError);
      } catch (notifyError) {
        console.error("Failed to notify recipient of new message", notifyError);
      }

      return ok(data as ChatMessage);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_message_send"));
    }
  },

  async deleteMessage(messageId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_deleted: true, content: "This message was deleted" } as never)
        .eq("id", messageId);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_message_delete"));
    }
  },

  async markConversationAsRead(conversationId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));

      const { error } = await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() } as never)
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_mark_read"));
    }
  },

  // --------------------------------------------------------------------------
  // Realtime
  // --------------------------------------------------------------------------
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: ChatMessage) => void
  ): RealtimeChannel {
    const supabase = getExtendedSupabaseClient();
    return supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();
  },

  unsubscribeFromConversation(channel: RealtimeChannel): void {
    const supabase = getExtendedSupabaseClient();
    void supabase.removeChannel(channel);
  },

  // --------------------------------------------------------------------------
  // Authorized conversation start (Phase C)
  // --------------------------------------------------------------------------
  // The only sanctioned way to start/find a direct conversation with another
  // user (the previous getOrCreateDirectConversation() had zero call sites
  // and was removed: its second conversation_members insert was silently
  // rejected by RLS for any non-admin caller - conversation_members' INSERT
  // policy only allows a self row). This calls the start_direct_conversation
  // SECURITY DEFINER RPC, which validates the admin/mentor/student pairing
  // boundary server-side and inserts both membership rows itself.
  async startAuthorizedDirectConversation(otherUserId: string): Promise<Result<string>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.rpc("start_direct_conversation", { p_other_user_id: otherUserId });
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_start_authorized_direct"));
    }
  },

  // --------------------------------------------------------------------------
  // Authorized recipient directory (Phase D)
  // --------------------------------------------------------------------------
  // profiles' SELECT RLS is self-only, so this is the only way the "New
  // Message" UI can even see candidate recipients. Server-computed via the
  // same authorization matrix as start_direct_conversation - never merge in
  // any other client-side recipient source.
  async listAuthorizedRecipients(): Promise<Result<{ id: string; full_name: string | null; email: string | null; role: string }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.rpc("list_authorized_message_recipients");
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_list_authorized_recipients"));
    }
  },

  // --------------------------------------------------------------------------
  // Admin: get all conversations
  // --------------------------------------------------------------------------
  async adminListConversations(): Promise<Result<Conversation[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          members:conversation_members(
            *,
            user:profiles(id, full_name)
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok((data as unknown as Conversation[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_admin_list"));
    }
  },
};
