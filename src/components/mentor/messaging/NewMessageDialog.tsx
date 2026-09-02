import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthorizedRecipients, useStartConversation } from "@/hooks/useMentorMessaging";

function initials(name: string | null | undefined) {
  const source = name?.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const ROLE_GROUP_LABEL: Record<string, string> = {
  admin: "Admins",
  mentor: "Mentors",
  student: "My Students",
};

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Base messages route to navigate into after starting a conversation. Defaults to the mentor portal for backward compatibility. */
  basePath?: string;
}

export function NewMessageDialog({ open, onOpenChange, basePath = "/mentor/messages" }: Readonly<NewMessageDialogProps>) {
  const navigate = useNavigate();
  const { data: recipients = [], isLoading } = useAuthorizedRecipients();
  const startConversation = useStartConversation();
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? recipients.filter((r) => (r.full_name ?? "").toLowerCase().includes(term) || (r.email ?? "").toLowerCase().includes(term))
      : recipients;
    const groups = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const bucket = groups.get(r.role) ?? [];
      bucket.push(r);
      groups.set(r.role, bucket);
    }
    return groups;
  }, [recipients, search]);

  const handleSelect = async (recipientId: string) => {
    try {
      const conversationId = await startConversation.mutateAsync(recipientId);
      onOpenChange(false);
      setSearch("");
      void navigate(`${basePath}/${conversationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start this conversation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Search for someone you're authorized to message.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="new-message-search" className="sr-only">
            Search recipients
          </label>
          <Input
            id="new-message-search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : grouped.size === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {search ? "No matching people." : "No one is currently available to message."}
            </p>
          ) : (
            Array.from(grouped.entries()).map(([role, people]) => (
              <div key={role} className="mb-3">
                <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {ROLE_GROUP_LABEL[role] ?? role}
                </p>
                <div className="grid gap-0.5">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => void handleSelect(person.id)}
                      disabled={startConversation.isPending}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials(person.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{person.full_name ?? "Unknown"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
                      </span>
                      {startConversation.isPending && startConversation.variables === person.id && (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
