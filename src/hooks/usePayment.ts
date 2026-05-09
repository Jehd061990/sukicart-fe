"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentService } from "@/lib/api/services/payment.service";
import { BuyerCheckoutPayload } from "@/types/payment";

export const usePayment = (paymentId?: string, options?: { sync?: boolean }) => {
  const createCheckoutMutation = useMutation({
    mutationFn: (payload: BuyerCheckoutPayload) =>
      paymentService.createBuyerCheckout(payload),
  });

  const paymentStatusQuery = useQuery({
    queryKey: ["payment-status", paymentId, options?.sync ? "sync" : "nosync"],
    queryFn: () =>
      paymentService.getPaymentStatus(String(paymentId), {
        sync: Boolean(options?.sync),
      }),
    enabled: Boolean(paymentId),
    refetchInterval: (query) =>
      query.state.data?.payment?.status === "pending" ? 3500 : false,
    retry: 1,
  });

  return {
    createCheckoutMutation,
    paymentStatusQuery,
  };
};
