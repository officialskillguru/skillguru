import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "./logger";

const GENERIC_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

// Service-layer errors (see assertServiceResponse in src/services/_shared.ts)
// throw an Error whose `.message` is already a safe, user-facing string derived
// from Postgres/PostgREST (constraint names, RLS rejections, validation text) -
// never raw SQL, stack traces, or secrets. Surface that instead of a generic
// toast so failures like "unexpected error" on save are actually diagnosable.
function toUserFacingMessage(error: unknown): string {
  if (error instanceof Error && error.message && error.message.length < 300) {
    return error.message;
  }
  return GENERIC_ERROR_MESSAGE;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        logger.error("Global Mutation Error", error);
        toast.error(toUserFacingMessage(error));
      },
    },
  },
});
