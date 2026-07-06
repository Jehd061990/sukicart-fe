"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { paymentService } from "@/lib/api/services/payment.service";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { SubscriptionPlanCode } from "@/types/payment";

const SLOT_UNIT_PRICE = 299;

const asErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data
  ) {
    return String(error.response.data.message);
  }

  return fallback;
};

const toDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const statusVariant = (status: string) => {
  if (["active", "paid"].includes(status)) {
    return "success" as const;
  }

  if (["pending", "trial"].includes(status)) {
    return "warning" as const;
  }

  if (["failed", "cancelled", "expired", "past_due"].includes(status)) {
    return "destructive" as const;
  }

  return "secondary" as const;
};

export function SubscriptionControlPanel() {
  const queryClient = useQueryClient();
  const [paymentIdFromUrl, setPaymentIdFromUrl] = useState<string | undefined>(undefined);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanCode>("FREE");
  const [selectedAddonSlots, setSelectedAddonSlots] = useState(0);
  const [selectedPlanTiming, setSelectedPlanTiming] = useState<"immediate" | "next_cycle">("immediate");
  const [isDowngradeConfirmOpen, setIsDowngradeConfirmOpen] = useState(false);
  const [isAddSlotsModalOpen, setIsAddSlotsModalOpen] = useState(false);
  const [addSlotsStep, setAddSlotsStep] = useState<"configure" | "confirm">("configure");
  const [pendingAdditionalSlots, setPendingAdditionalSlots] = useState(0);
  const [debouncedTargetAddonSlots, setDebouncedTargetAddonSlots] = useState(0);
  const [isPreviewDebouncing, setIsPreviewDebouncing] = useState(false);
  const previewDebounceTimerRef = useRef<number | null>(null);
  const lastSyncedPlanRef = useRef<SubscriptionPlanCode | null>(null);
  const previousSelectedPlanRef = useRef<SubscriptionPlanCode | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const paymentId = new URLSearchParams(window.location.search).get("paymentId") || undefined;
    setPaymentIdFromUrl(paymentId);
  }, []);

  const plansQuery = useQuery({
    queryKey: ["seller-subscription-plans"],
    queryFn: subscriptionService.getPlans,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const paymentStatusQuery = useQuery({
    queryKey: ["subscription-payment-status", paymentIdFromUrl],
    queryFn: () => paymentService.getPaymentStatus(String(paymentIdFromUrl), { sync: true }),
    enabled: Boolean(paymentIdFromUrl),
    refetchInterval: (query) =>
      query.state.data?.payment?.status === "pending" ? 3500 : false,
    retry: 1,
  });

  useEffect(() => {
    if (!paymentIdFromUrl) {
      return;
    }

    const paymentStatus = paymentStatusQuery.data?.payment?.status;
    if (paymentStatus === "paid") {
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-history"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
    }
  }, [paymentIdFromUrl, paymentStatusQuery.data?.payment?.status, queryClient]);

  const checkoutMutation = useMutation({
    mutationFn: subscriptionService.checkoutPlan,
    onSuccess: (data) => {
      if (data.payment?.checkoutUrl) {
        window.location.href = data.payment.checkoutUrl;
        return;
      }

      toast.success(data.message);
      if (data.schedule?.warning) {
        toast.info(data.schedule.warning);
      }
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-history"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to process subscription checkout"));
    },
  });

  const updateAddonMutation = useMutation({
    mutationFn: subscriptionService.updateAddonSlots,
    onSuccess: (data) => {
      if (data.payment?.checkoutUrl) {
        window.location.href = data.payment.checkoutUrl;
        return;
      }

      toast.success(data.message);
      setIsAddSlotsModalOpen(false);
      setAddSlotsStep("configure");
      setPendingAdditionalSlots(0);
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-history"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to update addon slots"));
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: subscriptionService.cancelCurrentSubscription,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["seller-billing-history"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to cancel subscription"));
    },
  });

  const subscription = subscriptionQuery.data?.subscription;
  const plans = plansQuery.data?.plans || [];

  useEffect(() => {
    const currentPlan = subscription?.plan as SubscriptionPlanCode | undefined;
    if (!currentPlan) {
      return;
    }

    const shouldSyncSelection =
      lastSyncedPlanRef.current === null || selectedPlan === lastSyncedPlanRef.current;

    if (shouldSyncSelection) {
      setSelectedPlan(currentPlan);
    }

    lastSyncedPlanRef.current = currentPlan;
  }, [selectedPlan, subscription?.plan]);

  useEffect(() => {
    const currentPlan = subscription?.plan as SubscriptionPlanCode | undefined;

    if (!currentPlan) {
      previousSelectedPlanRef.current = selectedPlan;
      return;
    }

    const switchedPlans = previousSelectedPlanRef.current !== selectedPlan;
    const selectedCurrentPlan = selectedPlan === currentPlan;

    if (selectedCurrentPlan && switchedPlans) {
      setSelectedAddonSlots(subscription?.addonSlots ?? 0);
    }

    previousSelectedPlanRef.current = selectedPlan;
  }, [selectedPlan, subscription?.plan, subscription?.addonSlots]);

  const selectedPlanDetail = plans.find((plan) => plan.code === selectedPlan);
  const currentPlanDetail = plans.find((plan) => plan.code === subscription?.plan);
  const currentAddonSlots = subscription?.addonSlots ?? 0;
  const currentUsedSlots = subscription?.activeDevices ?? 0;
  const currentMaxSlots = subscription?.totalSlots ?? 0;
  const currentRemainingSlots = Math.max(0, currentMaxSlots - currentUsedSlots);
  const currentBasePrice = currentPlanDetail?.monthlyAmount ?? Math.max(0, (subscription?.monthlyPrice ?? 0) - currentAddonSlots * SLOT_UNIT_PRICE);
  const currentMonthlyBill = subscription?.monthlyPrice ?? currentBasePrice + currentAddonSlots * SLOT_UNIT_PRICE;
  const targetAddonSlots = Math.max(0, currentAddonSlots + pendingAdditionalSlots);
  const targetTotalSlots = Math.max(1, (subscription?.includedSlots ?? 0) + targetAddonSlots);
  const targetMonthlyBill = currentBasePrice + targetAddonSlots * SLOT_UNIT_PRICE;
  const additionalMonthlyCost = targetMonthlyBill - currentMonthlyBill;
  const exceedsUsageOnReduce = targetTotalSlots < currentUsedSlots;
  const canManageAddonSlots = ["PRO", "BUSINESS"].includes(subscription?.plan || "");
  const isCurrentPlanSelected = Boolean(subscription?.plan) && selectedPlan === subscription?.plan;
  const isDowngradingToFree = subscription?.plan !== "FREE" && selectedPlan === "FREE";
  const effectiveDowngradeDate = subscription?.currentPeriodEnd || subscription?.billingDate || subscription?.nextBillingDate || null;

  const scheduleAddonPreview = (nextAddonSlots: number) => {
    if (!isAddSlotsModalOpen || !canManageAddonSlots) {
      setDebouncedTargetAddonSlots(nextAddonSlots);
      setIsPreviewDebouncing(false);
      return;
    }

    if (previewDebounceTimerRef.current) {
      window.clearTimeout(previewDebounceTimerRef.current);
    }

    setIsPreviewDebouncing(true);
    previewDebounceTimerRef.current = window.setTimeout(() => {
      setDebouncedTargetAddonSlots(nextAddonSlots);
      setIsPreviewDebouncing(false);
      previewDebounceTimerRef.current = null;
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (previewDebounceTimerRef.current) {
        window.clearTimeout(previewDebounceTimerRef.current);
      }
    };
  }, []);

  const addonPreviewQuery = useQuery({
    queryKey: ["seller-addon-preview", isAddSlotsModalOpen, debouncedTargetAddonSlots],
    queryFn: () => subscriptionService.previewAddonSlots({ addonSlots: debouncedTargetAddonSlots }),
    enabled: Boolean(isAddSlotsModalOpen && canManageAddonSlots),
  });
  const addonPreview = addonPreviewQuery.data?.preview;

  const estimatedMonthlyTotal = useMemo(() => {
    if (!selectedPlanDetail) {
      return 0;
    }

    const addonCost = selectedPlanDetail.addonSlotsEnabled ? selectedAddonSlots * 299 : 0;
    return selectedPlanDetail.monthlyAmount + addonCost;
  }, [selectedPlanDetail, selectedAddonSlots]);

  const submitPlanCheckout = () => {
    checkoutMutation.mutate({
      plan: selectedPlan,
      addonSlots: selectedAddonSlots,
      paymentMethod: "online",
      effectiveTiming: selectedPlanTiming,
    });
  };

  const onPlanCheckout = () => {
    if (isCurrentPlanSelected) {
      toast.info("You are already subscribed to this plan");
      return;
    }

    if (isDowngradingToFree) {
      setIsDowngradeConfirmOpen(true);
      return;
    }

    submitPlanCheckout();
  };

  const confirmDowngradeCheckout = () => {
    setIsDowngradeConfirmOpen(false);
    submitPlanCheckout();
  };

  const openAddSlotsModal = () => {
    if (!canManageAddonSlots) {
      toast.error("Add More Slots is only available for PRO and BUSINESS plans");
      return;
    }

    setPendingAdditionalSlots(0);
    setAddSlotsStep("configure");
    setDebouncedTargetAddonSlots(currentAddonSlots);
    setIsPreviewDebouncing(false);
    setIsAddSlotsModalOpen(true);
  };

  const closeAddSlotsModal = () => {
    if (updateAddonMutation.isPending) {
      return;
    }

    if (previewDebounceTimerRef.current) {
      window.clearTimeout(previewDebounceTimerRef.current);
      previewDebounceTimerRef.current = null;
    }

    setIsAddSlotsModalOpen(false);
    setAddSlotsStep("configure");
    setPendingAdditionalSlots(0);
    setIsPreviewDebouncing(false);
  };

  const adjustPendingSlots = (step: number) => {
    setPendingAdditionalSlots((current) => {
      const minDelta = -currentAddonSlots;
      const maxDelta = 200;
      const nextPending = Math.max(minDelta, Math.min(maxDelta, current + step));
      scheduleAddonPreview(Math.max(0, currentAddonSlots + nextPending));
      return nextPending;
    });
  };

  const resetPendingSlots = () => {
    setPendingAdditionalSlots(0);
    scheduleAddonPreview(currentAddonSlots);
  };

  const confirmAddSlotsUpdate = () => {
    if (exceedsUsageOnReduce) {
      toast.error("Cannot reduce slots below current active POS usage");
      return;
    }

    if (targetAddonSlots === currentAddonSlots) {
      toast.error("No slot changes to apply");
      return;
    }

    updateAddonMutation.mutate({ addonSlots: targetAddonSlots });
  };

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subscription Card</CardTitle>
            <CardDescription>
              Current plan, slot licensing, branch count, billing state, and actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.plan || "-"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant={statusVariant(subscription?.status || "")}>{subscription?.status || "-"}</Badge>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Monthly Billing</p>
                <p className="mt-1 text-lg font-semibold">PHP {subscription?.monthlyPrice ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Included Slots</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.includedSlots ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Extra Slots</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.addonSlots ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Total Slots</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.totalSlots ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Active Devices</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.activeDevices ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Branch Count</p>
                <p className="mt-1 text-lg font-semibold">{subscription?.branchCount ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Next Billing Date</p>
                <p className="mt-1 text-sm font-medium">{toDate(subscription?.nextBillingDate)}</p>
              </div>
            </div>

            {paymentIdFromUrl ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
                <p className="font-mono text-xs">Payment ID: {paymentIdFromUrl}</p>
                <p className="mt-1">
                  Payment status: <span className="font-semibold uppercase">{paymentStatusQuery.data?.payment?.status || "pending"}</span>
                </p>
              </div>
            ) : null}

            {subscription?.downgradeWarning ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Scheduled Downgrade</p>
                <p className="mt-1">{subscription.downgradeWarning}</p>
                <p className="mt-1 text-xs">
                  Until then, your current plan and paid add-ons remain active.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Checkout</CardTitle>
            <CardDescription>
              Upgrade or downgrade base plan with recurring billing via Xendit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan.code);
                    if (plan.code === subscription?.plan) {
                      setSelectedAddonSlots(subscription?.addonSlots ?? 0);
                    } else if (!plan.addonSlotsEnabled) {
                      setSelectedAddonSlots(0);
                    }
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedPlan === plan.code
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                  <p className="text-xs text-slate-600">{plan.includedSlots} included slot(s)</p>
                  <p className="mt-1 text-sm font-semibold text-brand-800">PHP {plan.monthlyAmount}/mo</p>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Additional POS Slots
              </label>
              <Input
                type="number"
                min={0}
                disabled={!selectedPlanDetail?.addonSlotsEnabled}
                value={selectedAddonSlots}
                onChange={(event) => setSelectedAddonSlots(Math.max(0, Number(event.target.value || 0)))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Extra slots cost PHP 299/month each.
              </p>
            </div>

            {/* <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Plan Change Timing
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedPlanTiming === "immediate" ? "default" : "outline"}
                  onClick={() => setSelectedPlanTiming("immediate")}
                >
                  Immediate
                </Button>
                <Button
                  type="button"
                  variant={selectedPlanTiming === "next_cycle" ? "default" : "outline"}
                  onClick={() => setSelectedPlanTiming("next_cycle")}
                >
                  Next Cycle
                </Button>
              </div>
            </div> */}

            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p>
                Estimated monthly total: <span className="font-semibold">PHP {estimatedMonthlyTotal}</span>
              </p>
              {isDowngradingToFree ? (
                <p className="mt-2 text-xs text-amber-700">
                  Downgrade target: FREE plan. {selectedPlanTiming === "next_cycle" ? `Takes effect on ${toDate(effectiveDowngradeDate)}.` : "Billing changes will apply immediately based on current-cycle rules."}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onPlanCheckout}
                disabled={checkoutMutation.isPending || isCurrentPlanSelected}
              >
                {checkoutMutation.isPending ? "Processing..." : "Upgrade or Downgrade Plan"}
              </Button>
              <Button
                variant="outline"
                onClick={openAddSlotsModal}
                disabled={updateAddonMutation.isPending || !canManageAddonSlots}
              >
                Add More Slots
              </Button>
              {/* <Button
                variant="outline"
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button> */}
            </div>
          </CardContent>
        </Card>
      </section>

      {isAddSlotsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscription Add-on</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Add More Slots</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage extra POS slot licenses for your {subscription?.plan || "current"} plan.
                </p>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={closeAddSlotsModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Current Used Slots</p>
                  <p className="mt-1 text-xl font-semibold">{currentUsedSlots}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Current Max Slots</p>
                  <p className="mt-1 text-xl font-semibold">{currentMaxSlots}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Remaining Slots</p>
                  <p className="mt-1 text-xl font-semibold">{currentRemainingSlots}</p>
                </div>
              </div>

              {addSlotsStep === "configure" ? (
                <>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">Additional Slots Controller</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground" title="A slot represents one active cashier terminal or POS device.">
                        <Info className="h-3.5 w-3.5" />
                        What is a slot?
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl border bg-white p-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => adjustPendingSlots(-1)}
                        disabled={pendingAdditionalSlots <= -currentAddonSlots}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-center transition-transform duration-200">
                        <p className="text-xs text-muted-foreground">Slot change</p>
                        <p className="text-2xl font-semibold text-slate-900">
                          {pendingAdditionalSlots >= 0 ? `+${pendingAdditionalSlots}` : pendingAdditionalSlots}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => adjustPendingSlots(1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-xs text-muted-foreground">Live Total Slots</p>
                        <p className="mt-1 text-xl font-semibold text-brand-700 transition-colors duration-200">
                          {addonPreview?.targetAddonSlots !== undefined
                            ? (subscription?.includedSlots ?? 0) + addonPreview.targetAddonSlots
                            : targetTotalSlots}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-xs text-muted-foreground">Additional Cost (monthly)</p>
                        <p className={`mt-1 text-xl font-semibold transition-colors duration-200 ${additionalMonthlyCost > 0 ? "text-brand-700" : additionalMonthlyCost < 0 ? "text-amber-700" : "text-slate-900"}`}>
                          {additionalMonthlyCost >= 0 ? "+" : "-"}PHP {Math.abs(additionalMonthlyCost)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border bg-white p-3 text-sm">
                      <p>
                        Base subscription price: <span className="font-semibold">PHP {currentBasePrice}</span>
                      </p>
                      <p>
                        Extra slots cost: <span className="font-semibold">PHP {addonPreview?.totalMonthlyAddonAmount ?? targetAddonSlots * SLOT_UNIT_PRICE}</span>
                      </p>
                      <p>
                        Prorated charge today: <span className="font-semibold">PHP {addonPreview?.proratedChargeToday ?? 0}</span>
                      </p>
                      <p>
                        Next renewal amount: <span className="font-semibold">PHP {addonPreview?.nextRenewalAmount ?? targetMonthlyBill}</span>
                      </p>
                      <p className="mt-1 border-t pt-2">
                        Total estimated monthly bill: <span className="font-semibold">PHP {addonPreview?.nextRenewalAmount ?? targetMonthlyBill}</span>
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Effective next billing date: {toDate(addonPreview?.billingDate || subscription?.nextBillingDate)}
                      </p>
                    </div>

                    {addonPreviewQuery.isLoading ? (
                      <p className="mt-2 text-xs text-muted-foreground">Refreshing prorated estimate...</p>
                    ) : null}

                    {isPreviewDebouncing ? (
                      <p className="mt-2 text-xs text-muted-foreground">Updating preview...</p>
                    ) : null}

                    {exceedsUsageOnReduce ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Warning: You cannot reduce slots below current usage ({currentUsedSlots} active devices).
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={resetPendingSlots}>
                      Reset to default
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAddSlotsStep("confirm")}
                      disabled={exceedsUsageOnReduce || targetAddonSlots === currentAddonSlots}
                    >
                      Review Update
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Confirmation Summary</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-xs text-muted-foreground">Added slots</p>
                      <p className="mt-1 text-lg font-semibold">
                        {pendingAdditionalSlots >= 0 ? `+${pendingAdditionalSlots}` : pendingAdditionalSlots}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-xs text-muted-foreground">Additional monthly cost</p>
                      <p className="mt-1 text-lg font-semibold">
                        {additionalMonthlyCost >= 0 ? "+" : "-"}PHP {Math.abs(additionalMonthlyCost)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Prorated charge today</p>
                      <p className="mt-1 text-lg font-semibold">PHP {addonPreview?.proratedChargeToday ?? 0}</p>
                    </div>
                    <div className="rounded-xl border bg-white p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">New total monthly subscription bill</p>
                      <p className="mt-1 text-lg font-semibold text-brand-800">PHP {addonPreview?.nextRenewalAmount ?? targetMonthlyBill}</p>
                    </div>
                  </div>

                  {exceedsUsageOnReduce ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Warning: Reduction exceeds current usage. Adjust slots before confirming.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setAddSlotsStep("configure")}>Back</Button>
                    <Button
                      type="button"
                      onClick={confirmAddSlotsUpdate}
                      disabled={updateAddonMutation.isPending || exceedsUsageOnReduce || targetAddonSlots === currentAddonSlots}
                    >
                      {updateAddonMutation.isPending ? "Updating..." : "Confirm & Update Subscription"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isDowngradeConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl">
            <div className="border-b p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Downgrade Confirmation</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Confirm downgrade to FREE</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your downgrade to FREE will take effect on {toDate(effectiveDowngradeDate)}.
              </p>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <p className="font-medium text-slate-900">What happens until period end:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Your current paid plan remains active.</li>
                <li>Your existing add-on slots remain available.</li>
                <li>No immediate branch or device cutoff is applied until the effective date.</li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDowngradeConfirmOpen(false)}
                >
                  Keep Current Plan
                </Button>
                <Button
                  type="button"
                  onClick={confirmDowngradeCheckout}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? "Processing..." : "Confirm Downgrade"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}