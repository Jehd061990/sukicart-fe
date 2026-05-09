import { motion } from "framer-motion";
import { DashboardWidgetDefinition } from "@/types/saas-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface KPIWidgetGridProps {
  widgets: DashboardWidgetDefinition[];
  hiddenWidgetIds: string[];
  onToggleHidden: (widgetId: string) => void;
  onDragStart: (widgetId: string) => void;
  onDrop: (widgetId: string) => void;
}

const TONE_CLASS = {
  success: "text-brand-700",
  warning: "text-amber-700",
  neutral: "text-foreground",
} as const;

export function KPIWidgetGrid({
  widgets,
  hiddenWidgetIds,
  onToggleHidden,
  onDragStart,
  onDrop,
}: KPIWidgetGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {widgets.map((widget, index) => {
        const hidden = hiddenWidgetIds.includes(widget.id);
        return (
          <motion.div
            key={widget.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            draggable
            onDragStart={() => onDragStart(widget.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(widget.id)}
          >
            <Card className={hidden ? "opacity-55" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{widget.title}</p>
                    <p className={`mt-1 text-2xl font-semibold ${TONE_CLASS[widget.tone]}`}>{widget.metric}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{widget.delta}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleHidden(widget.id)}
                  >
                    {hidden ? "Show" : "Hide"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
