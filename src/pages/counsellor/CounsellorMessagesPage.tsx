import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { ConversationList } from "@/components/mentor/messaging/ConversationList";
import { ConversationView } from "@/components/mentor/messaging/ConversationView";
import { NewMessageDialog } from "@/components/mentor/messaging/NewMessageDialog";

export default function CounsellorMessagesPage() {
  usePageMeta("Messages");
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-9.5rem)] min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className={`w-full flex-none border-r border-border lg:block lg:w-80 xl:w-96 ${conversationId ? "hidden" : "block"}`}>
        <ConversationList
          activeConversationId={conversationId}
          onSelect={(id) => void navigate(`/counsellor/messages/${id}`)}
          onNewMessage={() => setNewMessageOpen(true)}
        />
      </div>

      <div className={`min-w-0 flex-1 ${conversationId ? "block" : "hidden lg:block"}`}>
        {conversationId ? (
          <ConversationView key={conversationId} conversationId={conversationId} onBack={() => void navigate("/counsellor/messages")} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <MessageSquare className="size-12 text-muted-foreground/30" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground">Choose someone from the list, or start a new message.</p>
            </div>
          </div>
        )}
      </div>

      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} basePath="/counsellor/messages" />
    </div>
  );
}
