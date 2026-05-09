import { Search, Moon, Sun, Command } from "lucide-react";
import { SellerPlanTier } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  plan: SellerPlanTier;
  darkModeEnabled: boolean;
  selectedBranch: string;
  branchOptions: string[];
  onToggleTheme: () => void;
  onBranchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
}

export function TopNav({
  plan,
  darkModeEnabled,
  selectedBranch,
  branchOptions,
  onToggleTheme,
  onBranchChange,
  onOpenCommandPalette,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="truncate">Search products, orders, staff, and reports...</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {plan} Plan
          </span>
          <select
            value={selectedBranch}
            onChange={(event) => onBranchChange(event.target.value)}
            className="h-9 rounded-lg border bg-card px-2 text-sm"
            aria-label="Branch switcher"
          >
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={onOpenCommandPalette}>
            <Command className="mr-1 h-4 w-4" />
            Cmd
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onToggleTheme}>
            {darkModeEnabled ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
