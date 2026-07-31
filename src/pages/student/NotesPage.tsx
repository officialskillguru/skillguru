import { StickyNote, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMyNotes, useDeleteNote } from "@/hooks/student/useNotes";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";

export default function NotesPage() {
  const { data: notes, isLoading, error } = useMyNotes();
  const deleteNote = useDeleteNote();

  if (error) {
    return <ErrorState title="Failed to load your notes" message={error.message} />;
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    deleteNote.mutate(id, {
      onSuccess: () => toast.success("Note deleted."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete note."),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">My Notes</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase tracking-wide text-secondary">
                      {note.courses?.title ?? "Unknown course"} · {note.lessons?.title ?? "Unknown lesson"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{note.content}</p>
                    <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                      Updated {new Date(note.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {note.courses?.slug && (
                      <Link
                        to={`/courses/${note.courses.slug}`}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        View Course
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={deleteNote.isPending}
                      aria-label="Delete note"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No notes yet"
            message="Notes you take while learning will show up here."
            icon={<StickyNote className="size-10" aria-hidden="true" />}
          />
        )}
      </div>
    </div>
  );
}
