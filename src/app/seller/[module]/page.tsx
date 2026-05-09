"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import {
  SELLER_FEATURES_BY_PLAN,
  SELLER_MODULE_CATALOG,
} from "@/config/seller-dashboard";
import { SellerPlanTier } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";

export default function SellerModulePlaceholderPage() {
  const params = useParams<{ module: string }>();
  const moduleSlug = params.module;
  const moduleRoute = `/seller/${moduleSlug}`;

  const moduleConfig = SELLER_MODULE_CATALOG.find((item) => item.href === moduleRoute);

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  if (!moduleConfig) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Module Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested seller module is not configured yet.
        </p>
        <div className="mt-4">
          <Link href="/seller/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </section>
    );
  }

  const plan = (subscriptionQuery.data?.subscription?.plan || "FREE") as SellerPlanTier;
  const features = {
    ...(SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE),
    ...(subscriptionQuery.data?.subscription?.featureFlags || {}),
  };
  const enabled = features[moduleConfig.requiredFeature];

  if (subscriptionQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-linear-to-br from-amber-50 to-white p-6 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          <Lock className="h-3.5 w-3.5" />
          Locked Module
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">{moduleConfig.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{moduleConfig.description}</p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {moduleConfig.upgradeMessage || "Upgrade your subscription to unlock this module."}
        </p>
        <div className="mt-4">
          <Link href="/seller/pos">
            <Button>View Subscription Billing</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-brand-100 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">SukiGo Module</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{moduleConfig.label}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{moduleConfig.description}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        This production module scaffold is active and ready to connect to domain-specific APIs and data tables.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/seller/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
        <Link href="/seller/pos">
          <Button>Open Billing Controls</Button>
        </Link>
      </div>
    </section>
  );
}
