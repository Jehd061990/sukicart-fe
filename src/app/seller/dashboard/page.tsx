"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { SellerDashboardIncomePreset } from "@/types/seller-dashboard";

const PH_CURRENCY = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRangeLabel = (range: DateRange | undefined) => {
  if (!range?.from) {
    return "Select date range";
  }

  if (!range.to) {
    return range.from.toLocaleDateString();
  }

  return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`;
};

const getPresetRange = (preset: SellerDashboardIncomePreset): DateRange => {
  const now = new Date();

  if (preset === "yesterday") {
    const date = new Date(now);
    date.setDate(now.getDate() - 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  }

  if (preset === "this_week") {
    const start = new Date(now);
    const dayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOffset);
    return { from: startOfDay(start), to: endOfDay(now) };
  }

  if (preset === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: endOfDay(now),
    };
  }

  return {
    from: startOfDay(now),
    to: endOfDay(now),
  };
};

const toDeltaLabel = (value: number | null, suffix: string, fallback: string) => {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% ${suffix}`;
};

export default function SellerDashboardPage() {
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [incomePreset, setIncomePreset] = useState<SellerDashboardIncomePreset>("today");
  const [incomeRange, setIncomeRange] = useState<DateRange | undefined>(() => getPresetRange("today"));
  const [isIncomeRangePickerOpen, setIsIncomeRangePickerOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchPage, setBranchPage] = useState(1);
  const [terminalPage, setTerminalPage] = useState(1);
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

  const fromDate = useMemo(() => (incomeRange?.from ? toDateInput(incomeRange.from) : ""), [incomeRange?.from]);
  const toDate = useMemo(() => (incomeRange?.to ? toDateInput(incomeRange.to) : ""), [incomeRange?.to]);
  const incomeRangeLabel = useMemo(() => getRangeLabel(incomeRange), [incomeRange]);

  const dashboardIncomeQuery = useQuery({
    queryKey: [
      "seller-dashboard-income",
      incomePreset,
      fromDate,
      toDate,
      branchPage,
      selectedBranchId,
      terminalPage,
    ],
    queryFn: () =>
      sellerService.getDashboardIncome({
        preset: incomePreset,
        ...(incomePreset === "custom" ? { from: fromDate, to: toDate } : {}),
        branchPage,
        branchLimit: 8,
        ...(selectedBranchId ? { branchId: selectedBranchId, terminalPage, terminalLimit: 8 } : {}),
      }),
    enabled: incomePreset !== "custom" || Boolean(fromDate && toDate),
  });

  const applyIncomePreset = (nextPreset: SellerDashboardIncomePreset) => {
    setIncomePreset(nextPreset);
    setBranchPage(1);
    setTerminalPage(1);
    if (nextPreset !== "custom") {
      setIncomeRange(getPresetRange(nextPreset));
      setIsIncomeRangePickerOpen(false);
    }
  };

  useEffect(() => {
    setBranchPage(1);
    setTerminalPage(1);
  }, [fromDate, toDate, incomePreset]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    const branchExists =
      dashboardIncomeQuery.data?.branches.rows.some((branch) => branch.branchId === selectedBranchId) ||
      dashboardIncomeQuery.data?.selectedBranch?.branchId === selectedBranchId;

    if (!branchExists) {
      setSelectedBranchId(null);
      setTerminalPage(1);
    }
  }, [dashboardIncomeQuery.data?.branches.rows, dashboardIncomeQuery.data?.selectedBranch?.branchId, selectedBranchId]);

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

  const branchChartData = useMemo(
    () =>
      (dashboardIncomeQuery.data?.branches.rows || []).map((branch) => ({
        label:
          branch.branchName.length > 14
            ? `${branch.branchName.slice(0, 14)}...`
            : branch.branchName,
        netSales: branch.netSales,
        grossSales: branch.grossSales,
      })),
    [dashboardIncomeQuery.data?.branches.rows],
  );

  const branchTotalPages = Math.max(
    1,
    Math.ceil(
      Number(dashboardIncomeQuery.data?.branches.pagination.total || 0) /
        Number(dashboardIncomeQuery.data?.branches.pagination.limit || 8),
    ),
  );

  const terminalTotalPages = Math.max(
    1,
    Math.ceil(
      Number(dashboardIncomeQuery.data?.selectedBranch?.pagination.total || 0) /
        Number(dashboardIncomeQuery.data?.selectedBranch?.pagination.limit || 8),
    ),
  );

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

            <section className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Business Performance</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Income Analytics Dashboard</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Company summary, branch income overview, and POS terminal drilldown.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyIncomePreset("today")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      incomePreset === "today"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyIncomePreset("yesterday")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      incomePreset === "yesterday"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => applyIncomePreset("this_week")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      incomePreset === "this_week"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => applyIncomePreset("this_month")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      incomePreset === "this_month"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomePreset("custom")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      incomePreset === "custom"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {incomePreset === "custom" ? (
                <div className="relative mt-3">
                  <button
                    type="button"
                    onClick={() => setIsIncomeRangePickerOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <CalendarRange className="h-4 w-4" />
                    {incomeRangeLabel}
                  </button>

                  {isIncomeRangePickerOpen ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:absolute md:z-10">
                      <DayPicker
                        mode="range"
                        selected={incomeRange}
                        onSelect={(nextRange) => {
                          setIncomeRange(nextRange);
                          setIncomePreset("custom");
                        }}
                        numberOfMonths={2}
                        defaultMonth={incomeRange?.from}
                        className="text-sm"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsIncomeRangePickerOpen(false)}
                          className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {dashboardIncomeQuery.isLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading branch and terminal analytics...</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Net Sales</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {PH_CURRENCY.format(dashboardIncomeQuery.data?.overall.netSales || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Gross Sales</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {PH_CURRENCY.format(dashboardIncomeQuery.data?.overall.grossSales || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Discounts</p>
                      <p className="mt-1 text-xl font-semibold text-amber-700">
                        {PH_CURRENCY.format(dashboardIncomeQuery.data?.overall.discounts || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Refunds</p>
                      <p className="mt-1 text-xl font-semibold text-rose-700">
                        {PH_CURRENCY.format(dashboardIncomeQuery.data?.overall.refunds || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 xl:col-span-2">
                      <p className="text-sm font-semibold text-slate-900">Branch Income Overview</p>
                      <p className="mb-3 text-xs text-slate-500">Net vs gross sales per branch</p>
                      <div className="h-72 w-full">
                        <ResponsiveContainer>
                          <BarChart data={branchChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip
                              formatter={(value: number) => PH_CURRENCY.format(Number(value || 0))}
                            />
                            <Bar dataKey="netSales" fill="#0f766e" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="grossSales" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">Branches</p>
                      <div className="mt-2 space-y-2">
                        {(dashboardIncomeQuery.data?.branches.rows || []).map((branch) => (
                          <button
                            type="button"
                            key={branch.branchId || branch.branchName}
                            onClick={() => {
                              setSelectedBranchId(branch.branchId);
                              setTerminalPage(1);
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-left ${
                              selectedBranchId && branch.branchId === selectedBranchId
                                ? "border-brand-300 bg-brand-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{branch.branchName}</p>
                            <p className="text-xs text-slate-600">Net: {PH_CURRENCY.format(branch.netSales)}</p>
                            <p
                              className={`text-xs ${
                                branch.trendPct === null
                                  ? "text-slate-500"
                                  : branch.trendPct >= 0
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                              }`}
                            >
                              {branch.trendPct === null
                                ? "No prior period baseline"
                                : `${branch.trendPct > 0 ? "+" : ""}${branch.trendPct.toFixed(1)}% vs previous period`}
                            </p>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <p className="text-xs text-slate-500">Page {branchPage} of {branchTotalPages}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={branchPage <= 1}
                            onClick={() => setBranchPage((page) => Math.max(1, page - 1))}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={branchPage >= branchTotalPages}
                            onClick={() => setBranchPage((page) => Math.min(branchTotalPages, page + 1))}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {dashboardIncomeQuery.data?.selectedBranch ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            POS-Level Income Breakdown - {dashboardIncomeQuery.data.selectedBranch.branchName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Sales and transaction performance by POS terminal
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranchId(null);
                            setTerminalPage(1);
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        >
                          Close Drilldown
                        </button>
                      </div>

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-160 text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="px-2 py-2">POS Terminal</th>
                              <th className="px-2 py-2">Gross Sales</th>
                              <th className="px-2 py-2">Discounts</th>
                              <th className="px-2 py-2">Refunds</th>
                              <th className="px-2 py-2">Net Sales</th>
                              <th className="px-2 py-2">Transactions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardIncomeQuery.data.selectedBranch.terminals.map((terminal) => (
                              <tr key={terminal.terminalId || terminal.terminalLabel} className="border-b border-slate-100">
                                <td className="px-2 py-2 font-medium text-slate-800">{terminal.terminalLabel}</td>
                                <td className="px-2 py-2">{PH_CURRENCY.format(terminal.grossSales)}</td>
                                <td className="px-2 py-2 text-amber-700">{PH_CURRENCY.format(terminal.discounts)}</td>
                                <td className="px-2 py-2 text-rose-700">{PH_CURRENCY.format(terminal.refunds)}</td>
                                <td className="px-2 py-2 font-semibold text-slate-900">{PH_CURRENCY.format(terminal.netSales)}</td>
                                <td className="px-2 py-2">{terminal.transactions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <p className="text-xs text-slate-500">Page {terminalPage} of {terminalTotalPages}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={terminalPage <= 1}
                            onClick={() => setTerminalPage((page) => Math.max(1, page - 1))}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={terminalPage >= terminalTotalPages}
                            onClick={() => setTerminalPage((page) => Math.min(terminalTotalPages, page + 1))}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
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
