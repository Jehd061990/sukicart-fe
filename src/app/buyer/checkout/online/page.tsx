"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayment } from "@/hooks/usePayment";

function BuyerOnlinePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") || "";
  const { paymentStatusQuery } = usePayment(paymentId || undefined);

  const checkoutUrl = paymentStatusQuery.data?.payment?.checkoutUrl || "";
  const canProceed = Boolean(paymentId && checkoutUrl);

  const statusLabel = useMemo(() => {
    const value = String(paymentStatusQuery.data?.payment?.status || "pending").toLowerCase();
    return value.toUpperCase();
  }, [paymentStatusQuery.data?.payment?.status]);

  const goBackToCheckout = () => {
    if (!paymentId) {
      router.push("/buyer/checkout");
      return;
    }

    router.push(`/buyer/checkout?payment=cancelled&paymentId=${paymentId}`);
  };

  const continueToXendit = () => {
    if (!checkoutUrl) {
      return;
    }

    window.location.href = checkoutUrl;
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-4 px-4 py-5 sm:px-0">
      <Card className="border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
            Online Payment
          </CardTitle>
          <p className="font-sans text-sm text-gray-700">
            Continue to Xendit to complete payment, or go back to checkout to change payment method.
          </p>
        </CardHeader>
      </Card>

      <Card className="border-brand-200">
        <CardContent className="space-y-3 py-5">
          <p className="font-sans text-sm text-gray-700">Payment ID</p>
          <p className="font-mono text-sm font-semibold text-brand-900">{paymentId || "Not available"}</p>
          <p className="text-sm text-gray-700">
            Status: <span className="font-semibold uppercase">{statusLabel}</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBackToCheckout}
              className="border-brand-300 text-brand-800 hover:bg-brand-50"
            >
              Back to Checkout
            </Button>
            <Button
              type="button"
              onClick={continueToXendit}
              disabled={!canProceed || paymentStatusQuery.isLoading}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              {paymentStatusQuery.isLoading ? "Loading payment link..." : "Continue to Xendit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-3 z-20 px-4 sm:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={goBackToCheckout}
          className="w-full border-brand-300 bg-white text-brand-800 shadow-lg hover:bg-brand-50"
        >
          Back to Checkout
        </Button>
      </div>
    </section>
  );
}

export default function BuyerOnlinePaymentPage() {
  return (
    <Suspense fallback={<section className="px-4 py-6 text-sm text-gray-600">Loading payment details...</section>}>
      <BuyerOnlinePaymentContent />
    </Suspense>
  );
}
