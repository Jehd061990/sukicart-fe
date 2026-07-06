"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { SELLER_FEATURES_BY_PLAN } from "@/config/seller-dashboard";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { SellerPlanTier } from "@/types/saas-dashboard";

export function PlanFeatureFlagsPanel() {
  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const plan = (subscriptionQuery.data?.subscription?.plan || "FREE") as SellerPlanTier;
  const features = useMemo(() => {
    const defaultFeatures = SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE;
    return {
      ...defaultFeatures,
      ...(subscriptionQuery.data?.subscription?.featureFlags || {}),
    };
  }, [plan, subscriptionQuery.data?.subscription?.featureFlags]);
  const activePermissions = subscriptionQuery.data?.subscription?.activePermissions || [];

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Plan Feature Flags</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only diagnostics for effective feature access and active permission grants.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(features).map(([key, enabled]) => (
          <div
            key={key}
            className={`rounded-xl border px-3 py-2 text-xs ${
              enabled
                ? "border-brand-200 bg-brand-50 text-brand-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <p className="font-semibold">{key}</p>
            <p className="mt-1">{enabled ? "Enabled" : "Locked"}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Role-based rendering and subscription plan checks are applied before module access.
      </p>

      {activePermissions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activePermissions.slice(0, 20).map((permission) => (
            <span
              key={permission}
              className="rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {permission}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}