"use client";

import { PropsWithChildren, Suspense, useEffect, useRef, useState } from "react";
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
  const isSellerRoute = pathname.startsWith("/seller");
  const isPOSRoute = pathname.startsWith("/pos");
  const hideTopHeader = pathname.startsWith("/pos");
  const hideTopHeaderOnMobile = isSellerRoute && !hideTopHeader;
  const useNativeMobileScroll = hideTopHeaderOnMobile;
  const [isFloatingMenuVisible, setIsFloatingMenuVisible] = useState(true);
  const lastMobileScrollTopRef = useRef(0);
  const isMarketingRoute =
    pathname === "/" ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/scanner") ||
    pathname.startsWith("/seller/pending");

  useEffect(() => {
    setIsFloatingMenuVisible(true);
    lastMobileScrollTopRef.current = 0;
  }, [pathname, useNativeMobileScroll, isMobileSidebarOpen]);

  const handleMobileMainScroll = (event: React.UIEvent<HTMLElement>) => {
    if (!useNativeMobileScroll) {
      return;
    }

    const currentTop = event.currentTarget.scrollTop;
    const delta = currentTop - lastMobileScrollTopRef.current;

    if (currentTop <= 8) {
      setIsFloatingMenuVisible(true);
    } else if (delta > 6) {
      setIsFloatingMenuVisible(false);
    } else if (delta < -6) {
      setIsFloatingMenuVisible(true);
    }

    lastMobileScrollTopRef.current = currentTop;
  };

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
          <div className={hideTopHeaderOnMobile ? "hidden md:block" : undefined}>
            <AppHeader onOpenMenu={() => setMobileSidebarPath(pathname)} />
          </div>
        ) : null}
        {(hideTopHeader || hideTopHeaderOnMobile) && !isMobileSidebarOpen ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setMobileSidebarPath(pathname)}
            className={
              hideTopHeader
                ? "fixed top-1 left-1 z-50 h-10 w-10 rounded-full border border-slate-200 bg-white/95 shadow-md backdrop-blur md:hidden"
                : `fixed left-1 z-50 h-10 w-10 rounded-full border border-slate-200 bg-white/95 shadow-md backdrop-blur seller-menu-jump transition-all duration-300 md:hidden ${
                    isFloatingMenuVisible
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-2 opacity-0 pointer-events-none"
                  }`
            }
            style={
              hideTopHeader
                ? undefined
                : { top: "max(0.75rem, env(safe-area-inset-top))" }
            }
            aria-label="Open sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <main
          onScroll={handleMobileMainScroll}
          className={`flex-1 ${
            isPOSRoute
              ? "overflow-hidden p-0"
              : useNativeMobileScroll
                ? "overflow-y-auto p-3 pt-8 md:overflow-hidden md:p-6"
                : "overflow-hidden p-3 md:p-6"
          }`}
        >
          {isPOSRoute ? children : useNativeMobileScroll ? children : <SimplebarScroll className="h-full">{children}</SimplebarScroll>}
        </main>
      </div>
    </div>
  );
}
