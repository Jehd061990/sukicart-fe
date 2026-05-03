import { apiClient } from "@/lib/api/client";
import {
  BuyerCheckoutPayload,
  CreateBuyerCheckoutResponse,
  CreateSubscriptionCheckoutPayload,
  CreateSubscriptionCheckoutResponse,
  CancelSubscriptionResponse,
  GetMySubscriptionResponse,
  GetPaymentStatusResponse,
} from "@/types/payment";

export const paymentService = {
  createBuyerCheckout: async (payload: BuyerCheckoutPayload) => {
    const { data } = await apiClient.post<CreateBuyerCheckoutResponse>(
      "/payments/create-order",
      payload,
    );
    return data;
  },

  getPaymentStatus: async (paymentId: string) => {
    const { data } = await apiClient.get<GetPaymentStatusResponse>(
      `/payments/${paymentId}`,
    );
    return data;
  },

  createSubscriptionCheckout: async (payload: CreateSubscriptionCheckoutPayload) => {
    const { data } = await apiClient.post<CreateSubscriptionCheckoutResponse>(
      "/subscription/create",
      payload,
    );
    return data;
  },

  getMySubscription: async () => {
    const { data } = await apiClient.get<GetMySubscriptionResponse>(
      "/subscription/me",
    );
    return data;
  },

  cancelMySubscription: async () => {
    const { data } = await apiClient.patch<CancelSubscriptionResponse>(
      "/subscription/cancel",
    );
    return data;
  },
};
