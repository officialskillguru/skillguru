import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { chatService, type Conversation, type ChatMessage } from "@/services/chat.service";
import {
  createAnnouncement,
  listMyAnnouncements,
  resolveAnnouncementAudience,
  sendAnnouncement,
  listAnnouncementRecipients,
  type CreateAnnouncementInput,
} from "@/services/announcements.service";
import { useAuth } from "@/hooks/useAuth";

export const messagingQueryKeys = {
  conversations: () => ["messaging", "conversations"] as const,
  messages: (conversationId: string) => ["messaging", "messages", conversationId] as const,
  recipients: () => ["messaging", "recipients"] as const,
  announcements: () => ["messaging", "announcements"] as const,
  announcementRecipients: (campaignId: string) => ["messaging", "announcement-recipients", campaignId] as const,
};

function unwrap<T>(result: { success: true; data: T } | { success: false; error: Error }): T {
  if (!result.success) throw result.error;
  return result.data;
}

// ============================================================================
// Conversations / messages
// ============================================================================

export function useConversations() {
  return useQuery({
    queryKey: messagingQueryKeys.conversations(),
    queryFn: async () => unwrap(await chatService.listConversations()),
    staleTime: 15_000,
  });
}

export function useAuthorizedRecipients() {
  return useQuery({
    queryKey: messagingQueryKeys.recipients(),
    queryFn: async () => unwrap(await chatService.listAuthorizedRecipients()),
    staleTime: 60_000,
  });
}

/**
 * Loads a conversation's messages and keeps them live via Realtime for as
 * long as the hook is mounted. The caller is expected to mount the
 * component using this hook with `key={conversationId}` when switching
 * between conversations, so state resets naturally on remount rather than
 * needing an explicit "reset to empty" effect branch here.
 */
export function useConversationMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Tracks which conversationId the current `messages`/`error` actually
  // belong to, so "isLoading" can be derived at render time instead of set
  // synchronously inside the effect body (every setState call below happens
  // inside the async .then callback, never in the effect body itself).
  const [loadedForId, setLoadedForId] = useState<string | undefined>(undefined);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    void chatService.getMessages(conversationId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setMessages(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setLoadedForId(conversationId);
    });

    if (channelRef.current) chatService.unsubscribeFromConversation(channelRef.current);
    channelRef.current = chatService.subscribeToConversation(conversationId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        chatService.unsubscribeFromConversation(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  const isLoading = !!conversationId && loadedForId !== conversationId;

  return { messages, isLoading, error };
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation selected.");
      return unwrap(await chatService.sendMessage(conversationId, content));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations() });
    },
  });
}

/** Starts (or reuses) an authorized direct conversation and returns its id. Authorization is re-validated server-side regardless of the caller's own recipient list. */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => unwrap(await chatService.startAuthorizedDirectConversation(otherUserId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations() });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => unwrap(await chatService.markConversationAsRead(conversationId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations() });
    },
  });
}

/** The other member(s) of a direct conversation, relative to the current user - for rendering a title/avatar. */
export function useConversationCounterpart(conversation: Conversation | undefined) {
  const { authUser } = useAuth();
  const selfId = authUser?.profile?.id;
  const others = (conversation?.members ?? []).filter((m) => m.user_id !== selfId);
  return others[0]?.user ?? null;
}

// ============================================================================
// Announcements
// ============================================================================

export function useMyAnnouncements() {
  return useQuery({
    queryKey: messagingQueryKeys.announcements(),
    queryFn: () => listMyAnnouncements(),
    staleTime: 15_000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => createAnnouncement(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.announcements() });
    },
  });
}

export function useResolveAnnouncementAudience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, selectedRecipientIds }: { campaignId: string; selectedRecipientIds?: string[] }) =>
      resolveAnnouncementAudience(campaignId, selectedRecipientIds),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.announcements() });
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.announcementRecipients(variables.campaignId) });
    },
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, selectedRecipientIds }: { campaignId: string; selectedRecipientIds?: string[] }) =>
      sendAnnouncement(campaignId, selectedRecipientIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingQueryKeys.announcements() });
    },
  });
}

export function useAnnouncementRecipients(campaignId: string | undefined) {
  return useQuery({
    queryKey: messagingQueryKeys.announcementRecipients(campaignId ?? ""),
    queryFn: () => listAnnouncementRecipients(campaignId!),
    enabled: !!campaignId,
  });
}
