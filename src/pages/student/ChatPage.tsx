import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { chatService, type Conversation, type ChatMessage } from "@/services/chat.service";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

function ConversationItem({ conv, isSelected, onClick }: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { session } = useAuth();
  const otherMembers = conv.members?.filter(m => m.user_id !== session?.user?.id) ?? [];
  const title = conv.title ?? otherMembers.map(m => m.user?.full_name ?? "Support").join(", ");
  const initials = (title[0] ?? "?").toUpperCase();

  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${isSelected ? "bg-primary/10" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 flex-none rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-black text-primary-foreground" aria-hidden="true">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{title || "Conversation"}</p>
          <p className="text-xs text-muted-foreground">{conv.type === "group" ? "Group" : "Direct"}</p>
        </div>
      </div>
    </button>
  );
}

export default function ChatPage() {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["my-conversations"],
    queryFn: async () => {
      const r = await chatService.listConversations();
      if (!r.success) return [];
      return r.data;
    },
  });

  useEffect(() => {
    if (!selectedConv) return;
    if (channelRef.current) chatService.unsubscribeFromConversation(channelRef.current);

    void chatService.getMessages(selectedConv.id).then(r => {
      if (r.success) setMessages(r.data);
    });

    channelRef.current = chatService.subscribeToConversation(selectedConv.id, (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => { if (channelRef.current) chatService.unsubscribeFromConversation(channelRef.current); };
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!selectedConv || !newMsg.trim() || sending) return;
    setSending(true);
    try {
      const r = await chatService.sendMessage(selectedConv.id, newMsg.trim());
      if (!r.success) throw r.error;
      setMessages(prev => [...prev, r.data]);
      setNewMsg("");
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Sidebar */}
      <div className="flex w-64 flex-none flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <p className="font-black text-foreground">Messages</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="mx-4 my-2 h-14 animate-pulse rounded-xl bg-muted" />)
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-semibold text-muted-foreground">No conversations yet</p>
            </div>
          ) : conversations.map((conv: Conversation) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isSelected={selectedConv?.id === conv.id}
              onClick={() => setSelectedConv(conv)}
            />
          ))}
        </div>
      </div>

      {/* Thread */}
      {selectedConv ? (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-border px-5 py-3">
            <p className="font-semibold">{selectedConv.title ?? "Conversation"}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender_id === currentUserId ? "flex-row-reverse" : ""}`}>
                <div className="size-8 flex-none rounded-full bg-primary/20 flex items-center justify-center text-xs font-black text-primary" aria-hidden="true">
                  {msg.sender?.full_name?.[0] ?? "?"}
                </div>
                <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender_id === currentUserId
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {msg.is_deleted ? <em className="opacity-60">Deleted</em> : msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-4 flex gap-2">
            <label htmlFor="chat-message-input" className="sr-only">Message</label>
            <input
              id="chat-message-input"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type a message…"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            />
            <button
              onClick={() => void send()}
              disabled={sending || !newMsg.trim()}
              aria-label="Send message"
              className="rounded-xl bg-primary px-4 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <MessageSquare className="mx-auto mb-4 size-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-semibold">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
