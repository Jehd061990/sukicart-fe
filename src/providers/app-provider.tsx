"use client";

import { PropsWithChildren } from "react";
import { QueryProvider } from "@/providers/query-provider";

export function AppProvider({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
