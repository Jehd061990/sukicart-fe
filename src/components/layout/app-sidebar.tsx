"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getNavItemsByRole, ROLE_MODULES } from "@/config/navigation";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";
import { cn } from "@/lib/utils";
import {
  POS_SELLER_AUTH_BACKUP_KEY,
  POS_SELLER_DEFAULT_RETURN_PATH,
  POS_SELLER_RETURN_PATH_KEY,
  POS_SELLER_SWITCH_FLAG_KEY,
  POS_SELLER_SWITCH_FLAG_VALUE,
} from "@/constants/pos-switch";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sukigo:sidebar-collapsed";

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  forceDesktopCollapsed?: boolean;
}

export function AppSidebar({
  mobileOpen = false,
  onMobileClose,
  forceDesktopCollapsed = false,
}: AppSidebarProps) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistedValue = window.localStorage.getItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
    );

    if (persistedValue === "1") {
      setIsDesktopCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      isDesktopCollapsed ? "1" : "0",
    );
  }, [isDesktopCollapsed]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const inferredRole = ROLE_MODULES.find((moduleConfig) =>
    pathname.startsWith(moduleConfig.routeBase),
  )?.role;

  const navItems = getNavItemsByRole(role ?? inferredRole ?? null);
  const canBackToSeller = useMemo(() => {
    if (typeof window === "undefined" || role !== "POS") {
      return false;
    }

    const origin = window.sessionStorage.getItem(POS_SELLER_SWITCH_FLAG_KEY);
    const backup = window.sessionStorage.getItem(POS_SELLER_AUTH_BACKUP_KEY);
    const returnPath = window.sessionStorage.getItem(POS_SELLER_RETURN_PATH_KEY);
    return origin === POS_SELLER_SWITCH_FLAG_VALUE && Boolean(backup) && Boolean(returnPath);
  }, [role]);

  const handleLogout = async () => {
    try {
      if (user) {
        await authService.logout();
      }
    } catch {
      // Clear client auth state even if API logout fails.
    } finally {
      clearAuth();
      toast.success("Logged out successfully");
      router.push("/login");
      onMobileClose?.();
    }
  };

  const handleBackToSeller = () => {
    if (typeof window === "undefined") {
      return;
    }

    const backupRaw = window.sessionStorage.getItem(POS_SELLER_AUTH_BACKUP_KEY);
    const returnPath =
      window.sessionStorage.getItem(POS_SELLER_RETURN_PATH_KEY) ||
      POS_SELLER_DEFAULT_RETURN_PATH;

    if (!backupRaw) {
      return;
    }

    try {
      const backup = JSON.parse(backupRaw) as {
        accessToken: string;
        refreshToken: string;
        user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
        sessionId?: string | null;
        posUsage?: ReturnType<typeof useAuthStore.getState>["posUsage"];
      };

      if (!backup.accessToken || !backup.refreshToken || !backup.user) {
        return;
      }

      setAuth(
        backup.accessToken,
        backup.refreshToken,
        backup.user,
        backup.sessionId || null,
        backup.posUsage || null,
      );
      window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
      window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
      window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
      router.push(returnPath);
      onMobileClose?.();
    } catch {
      window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
      window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
      window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
    }
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && (forceDesktopCollapsed || isDesktopCollapsed);

    const isNavItemActive = (href: string) => {
      if (!href.includes("?")) {
        if (pathname !== href) {
          return false;
        }

        if (href === "/pos") {
          const activePanel = searchParams.get("panel");
          return !activePanel || activePanel === "sales";
        }

        return true;
      }

      const [targetPath, targetQueryString] = href.split("?");
      if (pathname !== targetPath) {
        return false;
      }

      const targetQuery = new URLSearchParams(targetQueryString || "");
      for (const [key, value] of targetQuery.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }

      return true;
    };

    return (
    <>
      <div
        className={cn(
          "mb-6 flex items-start justify-between gap-3 px-2",
          isCollapsed && "justify-center px-0",
        )}
      >
        <div className={cn(isCollapsed && "sr-only")}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">SukiGo</p>
          <h1 className="text-xl font-semibold leading-tight">{user?.name || "Guest"}</h1>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {user?.role || inferredRole || "not signed in"}
          </p>
        </div>

        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : !forceDesktopCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsDesktopCollapsed((prev) => !prev)}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>

      <SimplebarScroll className="min-h-0 flex-1 pr-1" contentClassName="space-y-1">
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  isCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </SimplebarScroll>

      <div className="mt-auto border-t pt-4">
        {canBackToSeller ? (
          <Button
            type="button"
            variant="secondary"
            className={cn("mb-2 w-full gap-2", isCollapsed ? "justify-center" : "justify-start")}
            onClick={handleBackToSeller}
            title={isCollapsed ? "Back to Seller" : undefined}
          >
            <ArrowLeft className="h-4 w-4" />
            {!isCollapsed ? "Back to Seller" : null}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className={cn("w-full gap-2", isCollapsed ? "justify-center" : "justify-start")}
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed ? "Logout" : null}
        </Button>
      </div>
    </>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r bg-card p-4 transition-all duration-200 md:block",
          forceDesktopCollapsed || isDesktopCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">{renderSidebarContent(false)}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-2000 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
            onClick={onMobileClose}
          />
          <aside className="relative z-10 h-full w-[84%] max-w-xs border-r bg-card p-4 shadow-xl">
            <div className="flex h-full flex-col">{renderSidebarContent(true)}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
