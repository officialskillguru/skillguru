import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
} from "@/hooks/useMentorMessaging";
import type { Conversation } from "@/services/chat.service";

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function conversationTitle(conv: Conversation, selfId: string | undefined) {
  if (conv.title) return conv.title;
  const others = (conv.members ?? []).filter((m) => m.user_id !== selfId);
  return others.map((m) => m.user?.full_name).filter(Boolean).join(", ") || "Conversation";
}

function formatDateSeparator(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

interface ConversationViewProps {
  conversationId: string;
  onBack?: () => void;
}

export function ConversationView({ conversationId, onBack }: Readonly<ConversationViewProps>) {
  const { authUser } = useAuth();
  const selfId = authUser?.profile?.id;
  const { data: conversations = [] } = useConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  const { messages, isLoading, error } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead.mutate(conversationId);
    // Only re-run when the conversation itself changes, not on every markRead identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 120;
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sendMessage.isPending) return;
    setDraft("");
    shouldAutoScroll.current = true;
    try {
      await sendMessage.mutateAsync(content);
    } catch (err) {
      setDraft(content);
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    }
  };

  const title = conversation ? conversationTitle(conversation, selfId) : "Conversation";
  const counterpartRole = (conversation?.members ?? []).find((m) => m.user_id !== selfId)?.role;

  let lastDateLabel = "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to conversation list">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <Avatar>
          <AvatarFallback>{initials(title)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{title}</p>
          {conversation && <p className="text-xs capitalize text-muted-foreground">{conversation.type}</p>}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 space-y-1 overflow-y-auto p-4"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-12 w-2/3 animate-pulse rounded-2xl bg-muted ${i % 2 ? "ml-auto" : ""}`} />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="size-8 text-destructive-text" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Couldn't load messages.</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-semibold text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Send the first message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === selfId;
            const dateLabel = formatDateSeparator(msg.created_at);
            const showDateSeparator = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;
            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">{dateLabel}</span>
                  </div>
                )}
                <div className={`flex gap-2 py-1 ${isSelf ? "flex-row-reverse" : ""}`}>
                  <Avatar className="size-7 self-end">
                    <AvatarFallback className="text-[10px]">{initials(msg.sender?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isSelf ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted text-foreground"
                    }`}
                  >
                    {msg.is_deleted ? <em className="opacity-70">This message was deleted</em> : msg.content}
                    <span className={`mt-1 block text-[10px] ${isSelf ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        {counterpartRole && (
          <div className="mb-2">
            <Badge variant="muted" className="capitalize">
              {counterpartRole}
            </Badge>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="message-composer" className="sr-only">
            Message
          </label>
          <textarea
            id="message-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
            rows={2}
            className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            type="button"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sendMessage.isPending}
            aria-label="Send message"
            aria-busy={sendMessage.isPending}
          >
            {sendMessage.isPending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
