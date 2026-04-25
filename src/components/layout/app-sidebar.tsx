"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getNavItemsByRole, ROLE_MODULES } from "@/config/navigation";
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
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);

  const inferredRole = ROLE_MODULES.find((moduleConfig) =>
    pathname.startsWith(moduleConfig.routeBase),
  )?.role;

  const navItems = getNavItemsByRole(role ?? inferredRole ?? null);

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-start justify-between gap-3 px-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            SukiCart
          </p>
          <h1 className="text-xl font-semibold">Control Panel</h1>
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

      <nav className="space-y-1">
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
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r bg-card p-4 md:block">
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
            onClick={onMobileClose}
          />
          <aside className="relative h-full w-[84%] max-w-xs border-r bg-card p-4 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
