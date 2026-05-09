import { CheckCircle2, Circle } from "lucide-react";
import { OnboardingStep, SellerFeatureFlags } from "@/types/saas-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingTrackerProps {
  steps: OnboardingStep[];
  features: SellerFeatureFlags;
}

export function OnboardingTracker({ steps, features }: OnboardingTrackerProps) {
  const completed = steps.filter((step) => features[step.featureKey]).length;
  const progress = Math.round((completed / Math.max(steps.length, 1)) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Onboarding Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{completed} of {steps.length} milestones ready ({progress}%)</p>
        <ul className="space-y-2">
          {steps.map((step) => {
            const enabled = features[step.featureKey];
            return (
              <li key={step.id} className="flex items-start gap-2">
                {enabled ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand-700" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
