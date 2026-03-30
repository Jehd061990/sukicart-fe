import { PropsWithChildren } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
