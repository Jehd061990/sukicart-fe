import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LockedModuleCardProps {
  title: string;
  description: string;
  upgradeMessage: string;
}

export function LockedModuleCard({
  title,
  description,
  upgradeMessage,
}: LockedModuleCardProps) {
  return (
    <Card className="relative overflow-hidden border-dashed border-amber-300 bg-linear-to-br from-amber-50 to-white">
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />
      <CardContent className="relative space-y-3 p-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          <Lock className="h-3.5 w-3.5" />
          Locked Premium Module
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          {upgradeMessage}
        </p>
      </CardContent>
    </Card>
  );
}
