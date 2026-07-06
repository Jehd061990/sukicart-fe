import Link from "next/link";
import { SellerDashboardModule, SellerFeatureFlags } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";

interface CommandPaletteProps {
  open: boolean;
  modules: SellerDashboardModule[];
  features: SellerFeatureFlags;
  onClose: () => void;
}

export function CommandPalette({ open, modules, features, onClose }: CommandPaletteProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center bg-black/40 p-3 pt-16">
      <div className="w-full max-w-xl rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold text-foreground">Command Palette</p>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <SimplebarScroll className="max-h-[65vh] p-2" contentClassName="space-y-1">
          {modules.map((module) => {
            const enabled = features[module.requiredFeature];
            return (
              <Link
                key={module.key}
                href={enabled ? module.href : "#"}
                onClick={(event) => {
                  if (!enabled) {
                    event.preventDefault();
                  } else {
                    onClose();
                  }
                }}
                className={`block rounded-lg border px-3 py-2 text-sm ${
                  enabled
                    ? "hover:border-primary hover:bg-primary/5"
                    : "cursor-not-allowed border-dashed border-amber-300 bg-amber-50 text-amber-800"
                }`}
              >
                <p className="font-medium">{module.label}</p>
                <p className="text-xs text-muted-foreground">
                  {enabled ? module.description : module.upgradeMessage || "Upgrade to unlock"}
                </p>
              </Link>
            );
          })}
        </SimplebarScroll>
      </div>
    </div>
  );
}
