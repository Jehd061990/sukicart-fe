"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { SellerPlanTier } from "@/types/saas-dashboard";
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
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
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

  const dashboardSummaryQuery = useQuery({
    queryKey: ["seller-dashboard-summary"],
    queryFn: sellerService.getDashboardSummary,
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
  const activePermissionCount = Object.values(features).filter(Boolean).length;

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

      </main>
    </div>
  );
}
