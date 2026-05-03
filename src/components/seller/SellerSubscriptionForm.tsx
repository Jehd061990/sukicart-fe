"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const PLAN_OPTIONS = [
  { code: "BASIC", name: "Basic", price: 499, slots: 1 },
  { code: "PRO", name: "Pro", price: 999, slots: 3 },
  { code: "BUSINESS", name: "Business", price: 1999, slots: 8 },
] as const;

export function SellerSubscriptionForm() {
  const searchParams = useSearchParams();
  const paymentIdFromUrl = searchParams.get("paymentId") || undefined;
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "PRO" | "BUSINESS">("BASIC");

  const {
    createSubscriptionMutation,
    cancelSubscriptionMutation,
    subscriptionQuery,
    paymentStatusQuery,
  } =
    useSubscription(paymentIdFromUrl);

  const currentSubscription = subscriptionQuery.data?.subscription;
  const paymentStatus = paymentStatusQuery.data?.payment?.status || "";

  const selected = useMemo(
    () => PLAN_OPTIONS.find((option) => option.code === selectedPlan) || PLAN_OPTIONS[0],
    [selectedPlan],
  );

  const onCheckout = async () => {
    try {
      const response = await createSubscriptionMutation.mutateAsync({
        plan: selectedPlan,
      });

      window.location.href = response.payment.checkoutUrl;
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Failed to create subscription checkout";

      toast.error(message);
    }
  };

  const onCancelSubscription = async () => {
    try {
      const result = await cancelSubscriptionMutation.mutateAsync();
      toast.success(result.message);
      subscriptionQuery.refetch();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Failed to cancel subscription";

      toast.error(message);
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-heading text-xl font-semibold text-slate-900">
        Seller Subscription Checkout
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Choose a recurring monthly plan for POS access. Payment confirmation comes from Xendit webhook events.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLAN_OPTIONS.map((plan) => {
          const active = selectedPlan === plan.code;

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => setSelectedPlan(plan.code)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 shadow-sm"
                  : "border-slate-200 hover:border-brand-300"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              <p className="mt-1 text-xs text-slate-600">{plan.slots} POS slot(s)</p>
              <p className="mt-2 text-lg font-bold text-brand-700">PHP {plan.price}/mo</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Selected plan: <span className="font-semibold">{selected.name}</span>
        </p>
        <p>
          Monthly billing: <span className="font-semibold">PHP {selected.price}</span>
        </p>
      </div>

      {paymentIdFromUrl ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          <p className="font-mono text-xs">Payment ID: {paymentIdFromUrl}</p>
          <p className="mt-1 uppercase">Status: {paymentStatus || "pending"}</p>
        </div>
      ) : null}

      {currentSubscription ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            Current plan: <span className="font-semibold">{currentSubscription.plan}</span>
          </p>
          <p>
            Subscription status: <span className="font-semibold uppercase">{currentSubscription.status}</span>
          </p>
          <p>
            Next billing date:{" "}
            <span className="font-semibold">
              {currentSubscription.nextBillingDate
                ? new Date(currentSubscription.nextBillingDate).toLocaleDateString()
                : "-"}
            </span>
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <Button onClick={onCheckout} disabled={createSubscriptionMutation.isPending}>
          {createSubscriptionMutation.isPending ? "Redirecting..." : "Proceed to Subscription Payment"}
        </Button>
        <Button
          variant="outline"
          className="ml-2"
          onClick={onCancelSubscription}
          disabled={cancelSubscriptionMutation.isPending}
        >
          {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
        </Button>
      </div>
    </section>
  );
}
