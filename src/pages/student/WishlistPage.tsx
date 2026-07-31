import { Heart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useWishlist, useToggleWishlist } from "@/hooks/student/useWishlist";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";

function formatPrice(value: number | null) {
  if (!value) return "Free";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export default function WishlistPage() {
  const { data: items, isLoading, error } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  if (error) {
    return <ErrorState title="Failed to load your wishlist" message={error.message} />;
  }

  const handleRemove = (courseId: string, title: string) => {
    toggleWishlist.mutate(
      { courseId, isWishlisted: true },
      {
        onSuccess: () => toast.success(`Removed "${title}" from your wishlist.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove from wishlist."),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">My Wishlist</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="group relative rounded-2xl border border-border p-5 transition-shadow hover:shadow-md">
                <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Heart className="size-10" aria-hidden="true" />
                </div>
                <h3 className="mb-1 truncate font-bold text-foreground">{item.courses?.title ?? "Untitled course"}</h3>
                <p className="mb-4 text-sm font-bold text-secondary">{formatPrice(item.courses?.price ?? null)}</p>

                <div className="flex gap-2 border-t border-border pt-4">
                  {item.courses?.slug && (
                    <Link
                      to={`/courses/${item.courses.slug}`}
                      className="flex-1 rounded-xl bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      View Course
                    </Link>
                  )}
                  <button
                    onClick={() => handleRemove(item.course_id, item.courses?.title ?? "this course")}
                    disabled={toggleWishlist.isPending}
                    aria-label={`Remove ${item.courses?.title ?? "course"} from wishlist`}
                    className="rounded-xl border border-border px-3 py-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    {toggleWishlist.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Heart className="size-4 fill-red-500 text-red-500" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your wishlist is empty"
            message="Save courses you're interested in to come back to them later."
            icon={<Heart className="size-10" aria-hidden="true" />}
            action={
              <Link to="/courses" className="rounded-xl bg-secondary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-secondary/90">
                Browse Catalog
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
