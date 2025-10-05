"use client";

import csrfService from "@/lib/services/csrfService";
import { useEffect } from "react";
import { Toaster } from "sonner";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize CSRF protection on app startup
    csrfService.initialize().catch(() => {
      // Silently handle initialization errors
      // CSRF tokens will be fetched when needed
    });
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          },
        }}
      />
    </>
  );
}
