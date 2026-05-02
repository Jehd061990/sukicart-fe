"use client";

import { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { PWARuntime } from "@/components/pwa/pwa-runtime";
import { AuthHydrationProvider } from "@/providers/auth-hydration-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <AuthHydrationProvider />
      <PWARuntime />
      {children}
      <Toaster position="top-right" richColors />
    </QueryProvider>
  );
}
