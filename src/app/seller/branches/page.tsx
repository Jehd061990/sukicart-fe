"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { BranchManagementPanel } from "@/components/seller/branch-management-panel";
import { Button } from "@/components/ui/button";
import { SELLER_FEATURES_BY_PLAN, SELLER_MODULE_CATALOG } from "@/config/seller-dashboard";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { SellerPlanTier } from "@/types/saas-dashboard";

export default function SellerBranchesPage() {
  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const plan = (subscriptionQuery.data?.subscription?.plan || "FREE") as SellerPlanTier;
  const features = {
    ...(SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE),
    ...(subscriptionQuery.data?.subscription?.featureFlags || {}),
  };
  const moduleConfig = SELLER_MODULE_CATALOG.find((item) => item.href === "/seller/branches");
  const enabled = features.multiBranch;

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
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          {moduleConfig?.label || "Multi-Branch"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {moduleConfig?.description || "Branch switcher, comparisons, and branch KPIs."}
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {moduleConfig?.upgradeMessage || "Upgrade your subscription to unlock this module."}
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
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold text-brand-900">
          Multi-Branch Management
        </h1>
        <p className="mt-1 text-sm text-gray-700">
          Manage branch records and operational status for your seller account.
        </p>
      </div>

      <BranchManagementPanel />
    </section>
  );
}