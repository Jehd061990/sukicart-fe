"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentService } from "@/lib/api/services/payment.service";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { SubscriptionCheckoutPayload } from "@/types/subscription";

export const useSubscription = (paymentId?: string) => {
  const createSubscriptionMutation = useMutation({
    mutationFn: (payload: SubscriptionCheckoutPayload) =>
      subscriptionService.checkoutPlan(payload),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription", "me"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: subscriptionService.cancelCurrentSubscription,
  });

  const paymentStatusQuery = useQuery({
    queryKey: ["subscription-payment-status", paymentId],
    queryFn: () => paymentService.getPaymentStatus(String(paymentId), { sync: true }),
    enabled: Boolean(paymentId),
    refetchInterval: (query) =>
      query.state.data?.payment?.status === "pending" ? 3500 : false,
    retry: 1,
  });

  return {
    createSubscriptionMutation,
    cancelSubscriptionMutation,
    subscriptionQuery,
    paymentStatusQuery,
  };
};
