"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMarketingRoute =
    pathname === "/" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/login");

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  if (isMarketingRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar
        mobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader onOpenMenu={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
