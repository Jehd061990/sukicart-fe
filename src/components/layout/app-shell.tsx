"use client";

import { PropsWithChildren, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [mobileSidebarPath, setMobileSidebarPath] = useState<string | null>(null);
  const isMobileSidebarOpen = mobileSidebarPath === pathname;
  const isPOSRoute = pathname.startsWith("/pos");
  const hideTopHeader =
    pathname.startsWith("/pos") || pathname.startsWith("/seller/pos");
  const isMarketingRoute =
    pathname === "/" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/scanner") ||
    pathname.startsWith("/seller/pending");

  if (isMarketingRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AppSidebar
        mobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setMobileSidebarPath(null)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!hideTopHeader ? (
          <AppHeader onOpenMenu={() => setMobileSidebarPath(pathname)} />
        ) : null}
        <main className={`flex-1 overflow-hidden ${isPOSRoute ? "p-0" : "p-3 md:p-6"}`}>
          {isPOSRoute ? children : <SimplebarScroll className="h-full">{children}</SimplebarScroll>}
        </main>
      </div>
    </div>
  );
}
