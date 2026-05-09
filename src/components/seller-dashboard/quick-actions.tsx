import Link from "next/link";
import { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-xl border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/5"
            >
              <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                Action
              </span>
              {action.label}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
