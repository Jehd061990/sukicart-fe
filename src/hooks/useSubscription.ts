"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentService } from "@/lib/api/services/payment.service";
import { CreateSubscriptionCheckoutPayload } from "@/types/payment";

export const useSubscription = (paymentId?: string) => {
  const createSubscriptionMutation = useMutation({
    mutationFn: (payload: CreateSubscriptionCheckoutPayload) =>
      paymentService.createSubscriptionCheckout(payload),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription", "me"],
    queryFn: paymentService.getMySubscription,
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: paymentService.cancelMySubscription,
  });

  const paymentStatusQuery = useQuery({
    queryKey: ["subscription-payment-status", paymentId],
    queryFn: () => paymentService.getPaymentStatus(String(paymentId)),
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
