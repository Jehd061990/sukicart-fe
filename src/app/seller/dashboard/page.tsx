"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { sellerService } from "@/lib/api/services/seller.service";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import {
  SELLER_FEATURES_BY_PLAN,
  SELLER_MODULE_CATALOG,
  SELLER_NOTIFICATIONS,
  SELLER_ONBOARDING_STEPS,
  SELLER_QUICK_ACTIONS,
  SELLER_WIDGETS_BY_PLAN,
} from "@/config/seller-dashboard";
import { SellerFeatureKey, SellerPlanTier } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";
import { useSellerDashboardStore } from "@/store/seller-dashboard.store";
import { CommandPalette } from "@/components/seller-dashboard/command-palette";
import { DashboardSkeleton } from "@/components/seller-dashboard/dashboard-skeleton";
import { KPIWidgetGrid } from "@/components/seller-dashboard/kpi-widget-grid";
import { LockedModuleCard } from "@/components/seller-dashboard/locked-module-card";
import { NotificationsFeed } from "@/components/seller-dashboard/notifications-feed";
import { OnboardingTracker } from "@/components/seller-dashboard/onboarding-tracker";
import { QuickActions } from "@/components/seller-dashboard/quick-actions";
import { SalesOverviewChart } from "@/components/seller-dashboard/sales-overview-chart";
import { SubscriptionStatusBanner } from "@/components/seller-dashboard/subscription-status-banner";

const parsePermissionInput = (rawValue: string) =>
  Array.from(
    new Set(
      rawValue
        .split(/[\n,]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

const PH_CURRENCY = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const toDeltaLabel = (value: number | null, suffix: string, fallback: string) => {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% ${suffix}`;
};

export default function SellerDashboardPage() {
  const queryClient = useQueryClient();
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [enabledOverridesState, setEnabledOverridesState] = useState<SellerFeatureKey[] | null>(null);
  const [disabledOverridesState, setDisabledOverridesState] = useState<SellerFeatureKey[] | null>(null);
  const [grantedPermissionsInputState, setGrantedPermissionsInputState] = useState<string | null>(null);
  const [revokedPermissionsInputState, setRevokedPermissionsInputState] = useState<string | null>(null);
  const {
    commandPaletteOpen,
    hiddenWidgetIds,
    personalizedWidgetOrder,
    setCommandPaletteOpen,
    moveWidget,
    toggleWidgetVisibility,
    hydratePlanDefaults,
  } = useSellerDashboardStore();

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const accessControlQuery = useQuery({
    queryKey: ["seller-access-control"],
    queryFn: subscriptionService.getAccessControl,
  });

  const dashboardSummaryQuery = useQuery({
    queryKey: ["seller-dashboard-summary"],
    queryFn: sellerService.getDashboardSummary,
  });

  const updateAccessMutation = useMutation({
    mutationFn: subscriptionService.updateAccessControl,
    onSuccess: (data) => {
      setEnabledOverridesState((data.overrides.features.enabled || []) as SellerFeatureKey[]);
      setDisabledOverridesState((data.overrides.features.disabled || []) as SellerFeatureKey[]);
      setGrantedPermissionsInputState((data.overrides.permissions.granted || []).join("\n"));
      setRevokedPermissionsInputState((data.overrides.permissions.revoked || []).join("\n"));
      toast.success("Access control overrides updated");
      queryClient.invalidateQueries({ queryKey: ["seller-access-control"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: () => {
      toast.error("Failed to update access control overrides");
    },
  });

  const plan = (subscriptionQuery.data?.subscription?.plan || "FREE") as SellerPlanTier;
  const features = useMemo(() => {
    const defaultFeatures = SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE;
    return {
      ...defaultFeatures,
      ...(subscriptionQuery.data?.subscription?.featureFlags || {}),
    };
  }, [plan, subscriptionQuery.data?.subscription?.featureFlags]);
  const widgets = SELLER_WIDGETS_BY_PLAN[plan] || SELLER_WIDGETS_BY_PLAN.FREE;
  const notifications = SELLER_NOTIFICATIONS[plan] || SELLER_NOTIFICATIONS.FREE;
  const onboardingSteps = SELLER_ONBOARDING_STEPS[plan] || SELLER_ONBOARDING_STEPS.FREE;

  useEffect(() => {
    hydratePlanDefaults(plan, widgets.map((widget) => widget.id));
  }, [hydratePlanDefaults, plan, widgets]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  const unlockedModules = useMemo(
    () => SELLER_MODULE_CATALOG.filter((module) => features[module.requiredFeature]),
    [features],
  );

  const lockedModules = useMemo(
    () => SELLER_MODULE_CATALOG.filter((module) => !features[module.requiredFeature]),
    [features],
  );

  const sortedWidgets = useMemo(() => {
    const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]));
    const knownOrder = personalizedWidgetOrder.filter((id) => widgetMap.has(id));
    const missing = widgets
      .map((widget) => widget.id)
      .filter((id) => !knownOrder.includes(id));

    return [...knownOrder, ...missing]
      .map((id) => widgetMap.get(id))
      .filter((widget): widget is NonNullable<typeof widget> => Boolean(widget));
  }, [personalizedWidgetOrder, widgets]);

  const summaryWidgetMetrics = useMemo(() => {
    const summary = dashboardSummaryQuery.data?.summary;
    if (!summary) {
      return null;
    }

    return {
      "today-sales": {
        metric: PH_CURRENCY.format(summary.todaySales),
        delta: toDeltaLabel(summary.todaySalesChangePct, "vs yesterday", "No sales yesterday"),
        tone: summary.todaySalesChangePct !== null && summary.todaySalesChangePct < 0 ? "warning" : "success",
      },
      "total-orders": {
        metric: String(summary.totalOrders),
        delta: `${summary.recentTransactions} in the last 24 hours`,
        tone: "neutral",
      },
      "product-count": {
        metric: String(summary.productCount),
        delta: `${summary.recentlyUpdatedProducts} recently updated`,
        tone: "neutral",
      },
      "low-stock": {
        metric: String(summary.lowStockCount),
        delta: `${summary.criticalLowStockCount} critical items`,
        tone: summary.lowStockCount > 0 ? "warning" : "success",
      },
      "recent-transactions": {
        metric: String(summary.recentTransactions),
        delta: "Last 24 hours",
        tone: "neutral",
      },
      "revenue-analytics": {
        metric: PH_CURRENCY.format(summary.monthlyRevenue),
        delta: toDeltaLabel(summary.monthlyRevenueChangePct, "month-over-month", "No previous month baseline"),
        tone: "success",
      },
      "monthly-sales": {
        metric: PH_CURRENCY.format(summary.monthlyRevenue),
        delta: "Rolling 30-day sales",
        tone: "success",
      },
      "executive-revenue": {
        metric: PH_CURRENCY.format(summary.monthlyRevenue),
        delta: "Rolling 30-day revenue",
        tone: "success",
      },
    } as Record<string, { metric: string; delta: string; tone: "success" | "warning" | "neutral" }>;
  }, [dashboardSummaryQuery.data?.summary]);

  const widgetMetrics = summaryWidgetMetrics;
  const resolvedWidgets = useMemo(
    () =>
      sortedWidgets.map((widget) => {
        const live = widgetMetrics?.[widget.id];
        if (!live) {
          return widget;
        }

        return {
          ...widget,
          metric: live.metric,
          delta: live.delta,
          tone: live.tone,
        };
      }),
    [sortedWidgets, widgetMetrics],
  );

  const summaryChartData = dashboardSummaryQuery.data
    ? {
        FREE: dashboardSummaryQuery.data.charts.daily,
        PRO: dashboardSummaryQuery.data.charts.weekly,
        BUSINESS: dashboardSummaryQuery.data.charts.channels,
      }
    : null;

  const liveChartData = summaryChartData?.[plan];

  const serverActivePermissions = subscriptionQuery.data?.subscription?.activePermissions || [];
  const serverOverrides = accessControlQuery.data?.overrides;
  const enabledOverrides = enabledOverridesState ?? ((serverOverrides?.features.enabled || []) as SellerFeatureKey[]);
  const disabledOverrides = disabledOverridesState ?? ((serverOverrides?.features.disabled || []) as SellerFeatureKey[]);
  const grantedPermissionsInput = grantedPermissionsInputState ?? (serverOverrides?.permissions.granted || []).join("\n");
  const revokedPermissionsInput = revokedPermissionsInputState ?? (serverOverrides?.permissions.revoked || []).join("\n");
  const allowedFeatureKeys = (accessControlQuery.data?.allowedFeatureKeys ||
    Object.keys(features)) as SellerFeatureKey[];
  const basePlanFeatures = SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE;
  const activePermissionCount = Object.values(features).filter(Boolean).length;

  const toggleFeatureOverride = (
    featureKey: SellerFeatureKey,
    mode: "enabled" | "disabled",
  ) => {
    if (mode === "enabled") {
      const exists = enabledOverrides.includes(featureKey);
      const next = exists
        ? enabledOverrides.filter((entry) => entry !== featureKey)
        : [...enabledOverrides, featureKey];
      setEnabledOverridesState(next);
      if (!exists) {
        setDisabledOverridesState((prev) => (prev || disabledOverrides).filter((entry) => entry !== featureKey));
      }
      return;
    }

    const exists = disabledOverrides.includes(featureKey);
    const next = exists
      ? disabledOverrides.filter((entry) => entry !== featureKey)
      : [...disabledOverrides, featureKey];
    setDisabledOverridesState(next);
    if (!exists) {
      setEnabledOverridesState((prev) => (prev || enabledOverrides).filter((entry) => entry !== featureKey));
    }
  };

  const saveAccessOverrides = () => {
    updateAccessMutation.mutate({
      featureOverrides: {
        enabled: enabledOverrides,
        disabled: disabledOverrides,
      },
      permissionOverrides: {
        granted: parsePermissionInput(grantedPermissionsInput),
        revoked: parsePermissionInput(revokedPermissionsInput),
      },
    });
  };

  if (subscriptionQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-full bg-linear-to-b from-muted/40 via-background to-background">
      <CommandPalette
        open={commandPaletteOpen}
        modules={SELLER_MODULE_CATALOG}
        features={features}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <main className="space-y-4 p-4 md:p-6">
            <SubscriptionStatusBanner plan={plan} />

            <section className="grid gap-3 xl:grid-cols-3">
              <div className="rounded-2xl border bg-card p-4 xl:col-span-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Plan-aware Experience
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">
                  SukiGo Seller Dashboard
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Role-based modules, feature flags, and SaaS progression are now active.
                  Current plan unlocks {unlockedModules.length} modules, {activePermissionCount} features, and {serverActivePermissions.length} active permissions.
                </p>
              </div>
              <QuickActions actions={SELLER_QUICK_ACTIONS} />
            </section>

            <KPIWidgetGrid
              widgets={resolvedWidgets}
              hiddenWidgetIds={hiddenWidgetIds}
              onToggleHidden={toggleWidgetVisibility}
              onDragStart={setDraggedWidgetId}
              onDrop={(droppedOnId) => {
                if (!draggedWidgetId || draggedWidgetId === droppedOnId) {
                  return;
                }

                moveWidget(draggedWidgetId, droppedOnId);
                setDraggedWidgetId(null);
              }}
            />

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <SalesOverviewChart plan={plan} data={liveChartData} />
              </div>
              <NotificationsFeed items={notifications} />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <div className="rounded-2xl border bg-card p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Locked Upsell Modules
                  </p>
                  {lockedModules.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {lockedModules.slice(0, 6).map((module) => (
                        <LockedModuleCard
                          key={module.key}
                          title={module.label}
                          description={module.description}
                          upgradeMessage={module.upgradeMessage || "Upgrade to unlock this module"}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                      All premium modules unlocked for BUSINESS.
                    </p>
                  )}
                </div>
              </div>
              <OnboardingTracker steps={onboardingSteps} features={features} />
            </section>

            <section className="rounded-2xl border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Plan Feature Flags</p>
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
              {serverActivePermissions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {serverActivePermissions.slice(0, 12).map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Access Control Overrides</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Override plan defaults per seller by forcing feature access and granting/revoking granular permissions.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={saveAccessOverrides}
                  disabled={updateAccessMutation.isPending}
                >
                  {updateAccessMutation.isPending ? "Saving..." : "Save Overrides"}
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {allowedFeatureKeys.map((featureKey) => {
                  const baseEnabled = Boolean(basePlanFeatures[featureKey]);
                  const effectiveEnabled = Boolean(features[featureKey]);
                  const forcedEnabled = enabledOverrides.includes(featureKey);
                  const forcedDisabled = disabledOverrides.includes(featureKey);

                  return (
                    <div key={featureKey} className="rounded-xl border p-3">
                      <p className="text-sm font-semibold text-foreground">{featureKey}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Plan default: {baseEnabled ? "Enabled" : "Locked"} | Effective: {effectiveEnabled ? "Enabled" : "Locked"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <label className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                          <input
                            type="checkbox"
                            checked={forcedEnabled}
                            onChange={() => toggleFeatureOverride(featureKey, "enabled")}
                          />
                          Force enable
                        </label>
                        <label className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                          <input
                            type="checkbox"
                            checked={forcedDisabled}
                            onChange={() => toggleFeatureOverride(featureKey, "disabled")}
                          />
                          Force disable
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold text-foreground">Granted Permissions Override</p>
                  <p className="mt-1 text-xs text-muted-foreground">One permission per line (or comma-separated).</p>
                  <textarea
                    value={grantedPermissionsInput}
                    onChange={(event) => setGrantedPermissionsInputState(event.target.value)}
                    className="mt-2 h-28 w-full rounded-lg border bg-background px-2 py-2 text-xs"
                    placeholder="reports:export\nautomation:manage"
                  />
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold text-foreground">Revoked Permissions Override</p>
                  <p className="mt-1 text-xs text-muted-foreground">One permission per line (or comma-separated).</p>
                  <textarea
                    value={revokedPermissionsInput}
                    onChange={(event) => setRevokedPermissionsInputState(event.target.value)}
                    className="mt-2 h-28 w-full rounded-lg border bg-background px-2 py-2 text-xs"
                    placeholder="billing:manage"
                  />
                </div>
              </div>
            </section>
      </main>
    </div>
  );
}
