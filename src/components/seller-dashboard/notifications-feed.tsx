import { Bell, CircleAlert, Info } from "lucide-react";
import { DashboardNotificationItem } from "@/types/saas-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotificationsFeedProps {
  items: DashboardNotificationItem[];
}

const LEVEL_ICON = {
  info: Info,
  warning: Bell,
  critical: CircleAlert,
} as const;

const LEVEL_TONE = {
  info: "text-brand-700 bg-brand-100 border-brand-200",
  warning: "text-amber-700 bg-amber-100 border-amber-200",
  critical: "text-red-700 bg-red-100 border-red-200",
} as const;

export function NotificationsFeed({ items }: NotificationsFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Real-time Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const Icon = LEVEL_ICON[item.level];
          return (
            <article key={item.id} className="rounded-xl border p-3">
              <p className={`mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${LEVEL_TONE[item.level]}`}>
                <Icon className="h-3.5 w-3.5" />
                {item.level}
              </p>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{item.timestamp}</p>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
