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
        .order("created_at", { referencedTable: "conversations", ascending: false });

      if (error) return fail(new DatabaseError(error.message, error.code));

      const conversations = data
        ?.map((d: unknown) => (d as { conversation: Conversation }).conversation)
        .filter(Boolean) ?? [];

      return ok(conversations);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_conversations_list"));
    }
  },

  async getOrCreateDirectConversation(otherUserId: string): Promise<Result<Conversation>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));

      // Check if direct conversation already exists between these two users
      const { data: existing } = await supabase
        .from("conversations")
        .select(`
          *,
          members:conversation_members(user_id)
        `)
        .eq("type", "direct");

      if (existing) {
        const found = (existing as unknown as (Conversation & { members: { user_id: string }[] })[]).find((conv) => {
          const memberIds = conv.members.map((m) => m.user_id);
          return memberIds.includes(user.id) && memberIds.includes(otherUserId) && conv.members.length === 2;
        });
        if (found) return ok(found as unknown as Conversation);
      }

      // Create new direct conversation
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct", created_by: user.id } as never)
        .select()
        .single();

      if (convErr) return fail(new DatabaseError(convErr.message, convErr.code));

      // Add both members
      const { error: membersErr } = await supabase.from("conversation_members").insert([
        { conversation_id: (conv as Conversation).id, user_id: user.id, role: "member" },
        { conversation_id: (conv as Conversation).id, user_id: otherUserId, role: "member" },
      ] as never[]);

      if (membersErr) return fail(new DatabaseError(membersErr.message, membersErr.code));
      return ok(conv as Conversation);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "chat_direct_create"));
    }
  },

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
