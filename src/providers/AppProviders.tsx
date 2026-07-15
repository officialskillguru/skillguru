import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/config/queryClient";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { LenisProvider } from "@/context/LenisProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LenisProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </LenisProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
