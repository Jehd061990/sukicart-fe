"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Info, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { billingService } from "@/lib/api/services/billing.service";
import { branchService } from "@/lib/api/services/branch.service";
import { paymentService } from "@/lib/api/services/payment.service";
import { posService } from "@/lib/api/services/pos.service";
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

function SellerPOSPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const paymentIdFromUrl = searchParams.get("paymentId") || undefined;

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

  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchContactNumber, setBranchContactNumber] = useState("");

  const [posName, setPosName] = useState("");
  const [posEmail, setPosEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [posBranchId, setPosBranchId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<"active" | "inactive" | "suspended">("active");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editPosName, setEditPosName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editAssignedUserId, setEditAssignedUserId] = useState("");
  const [editDeviceStatus, setEditDeviceStatus] = useState<"active" | "inactive" | "suspended">("active");

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
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
    }
  }, [paymentIdFromUrl, paymentStatusQuery.data?.payment?.status, queryClient]);

  const billingSummaryQuery = useQuery({
    queryKey: ["seller-billing-summary"],
    queryFn: billingService.getSummary,
  });

  const invoicesQuery = useQuery({
    queryKey: ["seller-billing-invoices"],
    queryFn: billingService.listInvoices,
  });

  const billingHistoryQuery = useQuery({
    queryKey: ["seller-billing-history"],
    queryFn: billingService.listHistory,
  });

  const billingTransactionsQuery = useQuery({
    queryKey: ["seller-billing-transactions"],
    queryFn: billingService.listTransactions,
  });

  const branchesQuery = useQuery({
    queryKey: ["seller-branches"],
    queryFn: branchService.listBranches,
  });

  const posListQuery = useQuery({
    queryKey: ["seller-pos-list"],
    queryFn: posService.listPOSAccounts,
  });

  const sessionListQuery = useQuery({
    queryKey: ["seller-pos-sessions"],
    queryFn: posService.listSessions,
  });

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

  const createBranchMutation = useMutation({
    mutationFn: branchService.createBranch,
    onSuccess: (data) => {
      toast.success(data.message);
      setBranchName("");
      setBranchAddress("");
      setBranchContactNumber("");
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to create branch"));
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" | "archived" }) =>
      branchService.updateBranch(id, { status }),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to update branch"));
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: branchService.deleteBranch,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to delete branch"));
    },
  });

  const createPOSMutation = useMutation({
    mutationFn: posService.createPOSAccount,
    onSuccess: (data) => {
      setGeneratedPassword(data.generatedPassword || null);
      setPosName("");
      setPosEmail("");
      setUsername("");
      setPassword("");
      setPosBranchId("");
      setAssignedUserId("");
      setDeviceStatus("active");
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to create POS account"));
    },
  });

  const updatePOSMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      posName?: string;
      email?: string;
      username?: string;
      password?: string;
      branchId?: string;
      assignedUserId?: string;
      deviceStatus?: "active" | "inactive" | "suspended";
    }) => posService.updatePOSAccount(payload.id, payload),
    onSuccess: (data) => {
      toast.success(data.message || "POS account updated");
      setEditingPosId(null);
      setEditPosName("");
      setEditEmail("");
      setEditUsername("");
      setEditPassword("");
      setEditBranchId("");
      setEditAssignedUserId("");
      setEditDeviceStatus("active");
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to update POS account"));
    },
  });

  const deactivatePOSMutation = useMutation({
    mutationFn: posService.deactivatePOSAccount,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to deactivate POS account"));
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: posService.forceLogoutSession,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to revoke session"));
    },
  });

  const subscription = subscriptionQuery.data?.subscription;
  const plans = plansQuery.data?.plans || [];
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

  const usageLabel = useMemo(() => {
    const usage = posListQuery.data?.usage;
    if (!usage) {
      return "POS usage: - / - active";
    }

    return `POS usage: ${usage.active} / ${usage.total} active devices`;
  }, [posListQuery.data?.usage]);

  const submitPlanCheckout = () => {
    checkoutMutation.mutate({
      plan: selectedPlan,
      addonSlots: selectedAddonSlots,
      paymentMethod: "online",
      effectiveTiming: selectedPlanTiming,
    });
  };

  const onPlanCheckout = () => {
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

  const onCreateBranch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }

    createBranchMutation.mutate({
      branchName: branchName.trim(),
      address: branchAddress.trim(),
      contactNumber: branchContactNumber.trim(),
    });
  };

  const onCreatePOS = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!posName.trim()) {
      toast.error("POS device name is required");
      return;
    }

    createPOSMutation.mutate({
      posName: posName.trim(),
      email: posEmail.trim() || undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      autoGeneratePassword: !password.trim(),
      branchId: posBranchId || undefined,
      assignedUserId: assignedUserId.trim() || undefined,
      deviceStatus,
    });
  };

  const startEditPOS = (pos: {
    id: string;
    posName: string;
    email?: string;
    username: string;
    branchId?: string | null;
    assignedUserId?: string | null;
    deviceStatus?: "active" | "inactive" | "suspended";
  }) => {
    setEditingPosId(pos.id);
    setEditPosName(pos.posName);
    setEditEmail(pos.email || "");
    setEditUsername(pos.username);
    setEditPassword("");
    setEditBranchId(pos.branchId || "");
    setEditAssignedUserId(pos.assignedUserId || "");
    setEditDeviceStatus(pos.deviceStatus || "active");
  };

  const submitEditPOS = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingPosId) {
      return;
    }

    updatePOSMutation.mutate({
      id: editingPosId,
      posName: editPosName.trim() || undefined,
      email: editEmail.trim() || undefined,
      username: editUsername.trim() || undefined,
      password: editPassword.trim() || undefined,
      branchId: editBranchId || undefined,
      assignedUserId: editAssignedUserId.trim() || undefined,
      deviceStatus: editDeviceStatus,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 font-sans text-xs font-medium text-brand-700">
          SaaS Control Center
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          Subscription, Billing, Branches, and POS Devices
        </h1>
        <p className="mt-2 font-sans text-sm text-gray-700">
          {usageLabel}
        </p>
      </section>

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
                    if (!plan.addonSlotsEnabled) {
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

            <div>
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
            </div>

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
              <Button onClick={onPlanCheckout} disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? "Processing..." : "Upgrade or Downgrade Plan"}
              </Button>
              <Button
                variant="outline"
                onClick={openAddSlotsModal}
                disabled={updateAddonMutation.isPending || !canManageAddonSlots}
              >
                Add More Slots
              </Button>
              <Button
                variant="outline"
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Branch Management</CardTitle>
            <CardDescription>
              BUSINESS onboarding flow: Step 1 upgrade, Step 2 create branches, Step 3 assign POS devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={onCreateBranch}>
              <Input
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                placeholder="Branch Name"
              />
              <Input
                value={branchAddress}
                onChange={(event) => setBranchAddress(event.target.value)}
                placeholder="Address"
              />
              <Input
                value={branchContactNumber}
                onChange={(event) => setBranchContactNumber(event.target.value)}
                placeholder="Contact Number"
              />
              <Button type="submit" disabled={createBranchMutation.isPending}>
                {createBranchMutation.isPending ? "Creating..." : "Create Branch"}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {(branchesQuery.data?.branches || []).map((branch) => (
                <div key={branch._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{branch.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {branch.address || "No address"} | {branch.contactNumber || "No contact"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={statusVariant(branch.status)}>{branch.status}</Badge>
                      {branch.isDefault ? <Badge variant="secondary">Main Branch</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateBranchMutation.isPending}
                      onClick={() =>
                        updateBranchMutation.mutate({
                          id: branch._id,
                          status: branch.status === "active" ? "inactive" : "active",
                        })
                      }
                    >
                      {branch.status === "active" ? "Set Inactive" : "Set Active"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateBranchMutation.isPending}
                      onClick={() =>
                        updateBranchMutation.mutate({
                          id: branch._id,
                          status: "archived",
                        })
                      }
                    >
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteBranchMutation.isPending || branch.isDefault}
                      onClick={() => deleteBranchMutation.mutate(branch._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing and Invoices</CardTitle>
            <CardDescription>
              Latest invoice, payment transaction, and lifecycle history snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Latest Invoice</p>
              <p className="text-sm font-medium">
                {billingSummaryQuery.data?.latestInvoice
                  ? `PHP ${billingSummaryQuery.data.latestInvoice.amount} (${billingSummaryQuery.data.latestInvoice.status})`
                  : "No invoices yet"}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Latest Transaction</p>
              <p className="text-sm font-medium">
                {billingSummaryQuery.data?.latestTransaction
                  ? `${billingSummaryQuery.data.latestTransaction.provider.toUpperCase()} ${billingSummaryQuery.data.latestTransaction.status}`
                  : "No transactions yet"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Invoices</p>
              {(invoicesQuery.data?.invoices || []).slice(0, 5).map((invoice) => (
                <div key={invoice._id} className="rounded-xl border p-2 text-sm">
                  <p className="font-medium">PHP {invoice.amount}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.status.toUpperCase()} | {toDate(invoice.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lifecycle History</p>
              {(billingHistoryQuery.data?.history || []).slice(0, 5).map((item) => (
                <div key={item._id} className="rounded-xl border p-2 text-sm">
                  <p className="font-medium">
                    {item.action} ({item.fromPlan || "-"} → {item.toPlan || "-"})
                  </p>
                  <p className="text-xs text-muted-foreground">{toDate(item.createdAt)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Payment Transactions</p>
              {(billingTransactionsQuery.data?.transactions || []).slice(0, 5).map((tx) => (
                <div key={tx._id} className="rounded-xl border p-2 text-sm">
                  <p className="font-medium">PHP {tx.amount} - {tx.status.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{toDate(tx.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>POS Device Management</CardTitle>
            <CardDescription>
              Register devices, assign branch and cashier, manage status, and control active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="grid gap-3 md:grid-cols-7" onSubmit={onCreatePOS}>
              <Input
                value={posName}
                onChange={(event) => setPosName(event.target.value)}
                placeholder="POS Device Name"
              />
              <Input
                value={posEmail}
                onChange={(event) => setPosEmail(event.target.value)}
                placeholder="Email (optional)"
                type="email"
              />
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
              />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (optional)"
                type="password"
              />
              <select
                value={posBranchId}
                onChange={(event) => setPosBranchId(event.target.value)}
                className="h-8 rounded-lg border bg-background px-2.5 text-sm"
              >
                <option value="">Auto branch</option>
                {(branchesQuery.data?.branches || []).map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
              <Input
                value={assignedUserId}
                onChange={(event) => setAssignedUserId(event.target.value)}
                placeholder="Assigned Cashier/User ID"
              />
              <select
                value={deviceStatus}
                onChange={(event) =>
                  setDeviceStatus(event.target.value as "active" | "inactive" | "suspended")
                }
                className="h-8 rounded-lg border bg-background px-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <div className="md:col-span-6">
                <Button type="submit" disabled={createPOSMutation.isPending}>
                  {createPOSMutation.isPending ? "Creating..." : "Create POS Device"}
                </Button>
              </div>
            </form>

            {generatedPassword ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">
                Generated password: {generatedPassword}
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Device</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Username</th>
                    <th className="px-2 py-2">Branch</th>
                    <th className="px-2 py-2">Assigned User</th>
                    <th className="px-2 py-2">Device Status</th>
                    <th className="px-2 py-2">Session Device</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(posListQuery.data?.data || []).map((pos) => (
                    <tr key={pos.id} className="border-b">
                      <td className="px-2 py-2">{pos.posName}</td>
                      <td className="px-2 py-2">{pos.email || "-"}</td>
                      <td className="px-2 py-2">{pos.username}</td>
                      <td className="px-2 py-2">{pos.branchName || "Main Branch"}</td>
                      <td className="px-2 py-2">{pos.assignedUserId || "-"}</td>
                      <td className="px-2 py-2">
                        <Badge variant={statusVariant(pos.deviceStatus || pos.status)}>
                          {pos.isDeactivated ? "deactivated" : pos.deviceStatus || pos.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">{pos.activeSession?.deviceName || "-"}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatePOSMutation.isPending}
                            onClick={() =>
                              startEditPOS({
                                id: pos.id,
                                posName: pos.posName,
                                email: pos.email,
                                username: pos.username,
                                branchId: pos.branchId,
                                assignedUserId: pos.assignedUserId,
                                deviceStatus: pos.deviceStatus,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deactivatePOSMutation.isPending || pos.isDeactivated}
                            onClick={() => deactivatePOSMutation.mutate(pos.id)}
                          >
                            Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingPosId ? (
              <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-7" onSubmit={submitEditPOS}>
                <Input
                  value={editPosName}
                  onChange={(event) => setEditPosName(event.target.value)}
                  placeholder="POS Device Name"
                />
                <Input
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="Email (optional)"
                  type="email"
                />
                <Input
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  placeholder="Username"
                />
                <Input
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  placeholder="New Password"
                  type="password"
                />
                <select
                  value={editBranchId}
                  onChange={(event) => setEditBranchId(event.target.value)}
                  className="h-8 rounded-lg border bg-background px-2.5 text-sm"
                >
                  <option value="">Auto branch</option>
                  {(branchesQuery.data?.branches || []).map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.branchName}
                    </option>
                  ))}
                </select>
                <Input
                  value={editAssignedUserId}
                  onChange={(event) => setEditAssignedUserId(event.target.value)}
                  placeholder="Assigned Cashier/User ID"
                />
                <select
                  value={editDeviceStatus}
                  onChange={(event) =>
                    setEditDeviceStatus(event.target.value as "active" | "inactive" | "suspended")
                  }
                  className="h-8 rounded-lg border bg-background px-2.5 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>

                <div className="flex gap-2 md:col-span-6">
                  <Button type="submit" disabled={updatePOSMutation.isPending}>
                    {updatePOSMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingPosId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Active Sessions</p>
              {(sessionListQuery.data?.data || []).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {session.role} - {session.deviceName || session.deviceId}
                    </p>
                    <p className="text-xs text-gray-600">
                      Last active: {toDate(session.lastActiveAt)} | IP: {session.ipAddress || "-"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={forceLogoutMutation.isPending}
                    onClick={() => forceLogoutMutation.mutate(session.id)}
                  >
                    Force Logout
                  </Button>
                </div>
              ))}
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
    </div>
  );
}

export default function SellerPOSPage() {
  return (
    <Suspense>
      <SellerPOSPageContent />
    </Suspense>
  );
}
