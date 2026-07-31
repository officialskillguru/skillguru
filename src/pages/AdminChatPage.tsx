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
  const otherMembers = conv.members?.filter(m => m.user_id !== conv.created_by) ?? [];
  const title = conv.title ?? otherMembers.map(m => m.user?.full_name ?? "Unknown").join(", ");

  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className={`w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
        isSelected ? "bg-primary/10" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 flex-none rounded-full bg-primary/20 flex items-center justify-center text-sm font-black text-primary">
          {title[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-foreground">{title || "Conversation"}</p>
          <p className="text-xs text-muted-foreground">
            {conv.type === "group" ? "Group" : "Direct"} • {new Date(conv.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="size-8 flex-none rounded-full bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
        {message.sender?.full_name?.[0] ?? "?"}
      </div>
      <div className={`max-w-xs space-y-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <p className="text-xs text-muted-foreground">{message.sender?.full_name ?? "Unknown"}</p>
        <div className={`rounded-2xl px-4 py-2.5 text-sm ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        }`}>
          {message.is_deleted ? <em className="opacity-60">Message deleted</em> : message.content}
        </div>
        <p className="text-xs text-muted-foreground/60">
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function AdminChatPage() {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const r = await chatService.adminListConversations();
      if (!r.success) return [];
      return r.data;
    },
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConv) return;

    // Unsubscribe from previous channel
    if (channelRef.current) {
      chatService.unsubscribeFromConversation(channelRef.current);
    }

    // Load initial messages
    void chatService.getMessages(selectedConv.id).then(r => {
      if (r.success) setMessages(r.data);
    });

    // Subscribe to new messages
    channelRef.current = chatService.subscribeToConversation(selectedConv.id, (msg) => {
      setMessages(prev => [...prev, msg]);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return () => {
      if (channelRef.current) {
        chatService.unsubscribeFromConversation(channelRef.current);
      }
    };
  }, [selectedConv]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!selectedConv || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const r = await chatService.sendMessage(selectedConv.id, newMessage.trim());
      if (!r.success) throw r.error;
      setMessages(prev => [...prev, r.data]);
      setNewMessage("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Sidebar — Conversation List */}
      <div className="flex w-72 flex-none flex-col border-r border-border">
        <div className="border-b border-border p-4">
          <h2 className="text-base font-black text-foreground">Messages</h2>
          <p className="text-xs text-muted-foreground">{conversations.length} conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mx-4 my-2 h-14 animate-pulse rounded-xl bg-muted" />
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">No conversations</p>
              <p className="text-xs text-muted-foreground mt-1">Chats from students and mentors will appear here.</p>
            </div>
          ) : (
            conversations.map((conv: Conversation) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selectedConv?.id === conv.id}
                onClick={() => setSelectedConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main — Message Thread */}
      {selectedConv ? (
        <div className="flex flex-1 flex-col">
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-black text-primary">
              {selectedConv.title?.[0]?.toUpperCase() ?? "C"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{selectedConv.title ?? "Conversation"}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedConv.type} • {selectedConv.members?.length ?? 0} members</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === currentUserId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-3">
              <label htmlFor="admin-chat-message" className="sr-only">Type a message</label>
              <input
                id="admin-chat-message"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Type a message…"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={sending || !newMessage.trim()}
                aria-label="Send message"
                className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Send className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
          <MessageSquare className="mb-4 size-16 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-lg font-black text-foreground">Select a conversation</p>
          <p className="mt-2 text-sm text-muted-foreground">Choose a conversation from the sidebar to start messaging.</p>
        </div>
      )}
    </div>
  );
}
