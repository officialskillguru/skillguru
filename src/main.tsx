import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import App from "@/App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { LenisProvider } from "@/context/LenisProvider";

import "@/styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LenisProvider>
          <App />
          <Toaster richColors position="top-right" />
        </LenisProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
