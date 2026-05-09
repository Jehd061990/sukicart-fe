import Link from "next/link";
import { Lock } from "lucide-react";
import { SellerDashboardModule, SellerFeatureFlags } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";

interface PlanSidebarProps {
  modules: SellerDashboardModule[];
  features: SellerFeatureFlags;
  collapsed: boolean;
  activePath: string;
  onToggleCollapsed: () => void;
}

export function PlanSidebar({
  modules,
  features,
  collapsed,
  activePath,
  onToggleCollapsed,
}: PlanSidebarProps) {
  return (
    <aside className={`sticky top-0 h-screen border-r bg-card transition-all ${collapsed ? "w-20" : "w-72"}`}>
      <div className="flex h-full flex-col p-3">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className={collapsed ? "hidden" : "block"}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SukiGo</p>
            <p className="text-sm font-semibold text-foreground">Seller Workspace</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleCollapsed}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>

        <nav className="space-y-1 overflow-y-auto">
          {modules.map((module) => {
            const enabled = features[module.requiredFeature];
            const active = activePath === module.href;
            const Icon = module.icon;

            if (!enabled) {
              return (
                <div
                  key={module.key}
                  className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <Lock className="h-4 w-4" />
                    {!collapsed ? module.label : "Locked"}
                  </p>
                  {!collapsed ? (
                    <p className="mt-1 text-xs text-amber-700">{module.upgradeMessage || "Upgrade to unlock"}</p>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={module.key}
                href={module.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {!collapsed ? module.label : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
