"use client";

import { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-right" richColors />
    </QueryProvider>
  );
}
