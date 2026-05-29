"use client";

import { PropsWithChildren, Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [mobileSidebarPath, setMobileSidebarPath] = useState<string | null>(null);
  const isMobileSidebarOpen = mobileSidebarPath === pathname;
  const isPOSRoute = pathname.startsWith("/pos");
  const hideTopHeader = pathname.startsWith("/pos");
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
      <Suspense
        fallback={
          <aside className="hidden h-screen w-72 border-r border-slate-200 bg-white/70 md:block" />
        }
      >
        <AppSidebar
          mobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setMobileSidebarPath(null)}
          forceDesktopCollapsed={false}
        />
      </Suspense>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!hideTopHeader ? (
          <AppHeader onOpenMenu={() => setMobileSidebarPath(pathname)} />
        ) : null}
        {hideTopHeader && !isMobileSidebarOpen ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setMobileSidebarPath(pathname)}
            className="fixed top-1 left-1 z-50 h-10 w-10 rounded-full border border-slate-200 bg-white/95 shadow-md backdrop-blur md:hidden"
            aria-label="Open sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <main className={`flex-1 overflow-hidden ${isPOSRoute ? "p-0" : "p-3 md:p-6"}`}>
          {isPOSRoute ? children : <SimplebarScroll className="h-full">{children}</SimplebarScroll>}
        </main>
      </div>
    </div>
  );
}
