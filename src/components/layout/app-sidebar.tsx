import Link from "next/link";
import { SIDEBAR_NAV_ITEMS } from "@/config/navigation";

export function AppSidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r bg-card p-4 md:block">
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          SukiCart
        </p>
        <h1 className="text-xl font-semibold">Control Panel</h1>
      </div>

      <nav className="space-y-1">
        {SIDEBAR_NAV_ITEMS.map((item) => {
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
