"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { getNavItemsByRole, ROLE_MODULES } from "@/config/navigation";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
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

  const sidebarContent = (
    <>
      <div className="mb-6 flex items-start justify-between gap-3 px-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            SukiCart
          </p>
          <h1 className="text-xl font-semibold leading-tight">
            {user?.name || "Guest"}
          </h1>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {user?.role || inferredRole || "not signed in"}
          </p>
        </div>
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
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-4">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card p-4 md:block">
        <div className="flex h-full flex-col">{sidebarContent}</div>
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
            <div className="flex h-full flex-col">{sidebarContent}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
