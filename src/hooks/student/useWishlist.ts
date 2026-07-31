import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { commerceService } from "@/services/commerce.service";
import type { Tables } from "@/types/database";

export type WishlistItem = Tables<"wishlists"> & { courses: Tables<"courses"> | null };

const wishlistKey = (userId: string) => ["wishlist", userId] as const;

export function useWishlist() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: wishlistKey(userId ?? ""),
    queryFn: async () => {
      const res = await commerceService.getWishlist(userId ?? "");
      if (!res.success) throw res.error;
      return res.data as unknown as WishlistItem[];
    },
    enabled: !!userId,
  });
}

/** Real add/remove state for a single course's wishlist button (e.g. on CourseDetailsPage). */
export function useIsWishlisted(courseId: string | undefined) {
  const { data: items, isLoading } = useWishlist();
  const isWishlisted = !!courseId && !!items?.some((item) => item.course_id === courseId);
  return { isWishlisted, isLoading };
}

export function useToggleWishlist() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, isWishlisted }: { courseId: string; isWishlisted: boolean }) => {
      if (!userId) throw new Error("You must be signed in.");
      const res = isWishlisted
        ? await commerceService.removeFromWishlist(userId, courseId)
        : await commerceService.addToWishlist(userId, courseId);
      if (!res.success) throw res.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: wishlistKey(userId) });
    },
  });
}
