"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsByRole, ROLE_MODULES } from "@/config/navigation";
import { useAuthStore } from "@/store/auth.store";

export function AppSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);

  const inferredRole = ROLE_MODULES.find((moduleConfig) =>
    pathname.startsWith(moduleConfig.routeBase),
  )?.role;

  const navItems = getNavItemsByRole(role ?? inferredRole ?? null);

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r bg-card p-4 md:block">
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          SukiCart
        </p>
        <h1 className="text-xl font-semibold">Control Panel</h1>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
