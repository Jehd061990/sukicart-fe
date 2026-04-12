"use client";

import { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { AuthHydrationProvider } from "@/providers/auth-hydration-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <AuthHydrationProvider />
      {children}
      <Toaster position="top-right" richColors />
    </QueryProvider>
  );
}
