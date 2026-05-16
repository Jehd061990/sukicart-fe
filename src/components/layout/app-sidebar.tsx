"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getNavItemsByRole, ROLE_MODULES } from "@/config/navigation";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sukigo:sidebar-collapsed";

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  mobileOpen = false,
  onMobileClose,
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
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const inferredRole = ROLE_MODULES.find((moduleConfig) =>
    pathname.startsWith(moduleConfig.routeBase),
  )?.role;

  const navItems = getNavItemsByRole(role ?? inferredRole ?? null);

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

  const renderSidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && isDesktopCollapsed;

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
        ) : (
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
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

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

      <div className="mt-auto border-t pt-4">
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
          isDesktopCollapsed ? "w-20" : "w-64",
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
