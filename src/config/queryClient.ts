import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "./logger";

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
        toast.error("An unexpected error occurred. Please try again.");
      },
    },
  },
});
