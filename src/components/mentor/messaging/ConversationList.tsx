import { useMemo, useState } from "react";
import { Search, MessageSquarePlus, MessageSquare, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useMentorMessaging";
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

interface ConversationListProps {
  activeConversationId: string | undefined;
  onSelect: (conversationId: string) => void;
  onNewMessage: () => void;
}

export function ConversationList({ activeConversationId, onSelect, onNewMessage }: Readonly<ConversationListProps>) {
  const { authUser } = useAuth();
  const selfId = authUser?.profile?.id;
  const { data: conversations = [], isLoading, isError, refetch } = useConversations();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conv) => conversationTitle(conv, selfId).toLowerCase().includes(term));
  }, [conversations, search, selfId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-black text-foreground">Inbox</p>
        <Button size="sm" className="gap-1.5" onClick={onNewMessage}>
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          New
        </Button>
      </div>
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="conversation-search" className="sr-only">
            Search conversations
          </label>
          <Input
            id="conversation-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="size-8 text-destructive-text" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Couldn't load conversations.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <MessageSquare className="size-10 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">{search ? "No matching conversations." : "No conversations yet."}</p>
            {!search && <p className="text-xs text-muted-foreground">Start a conversation with an admin or your students.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Conversations">
            {filtered.map((conv) => {
              const title = conversationTitle(conv, selfId);
              const isActive = conv.id === activeConversationId;
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                      isActive ? "bg-primary/5" : ""
                    }`}
                  >
                    <Avatar>
                      <AvatarFallback>{initials(title)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.last_message?.content ?? (conv.type === "group" ? "Group conversation" : "No messages yet")}
                      </p>
                    </div>
                    {conv.updated_at && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
