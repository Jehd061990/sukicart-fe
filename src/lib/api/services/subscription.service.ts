import { apiClient } from "@/lib/api/client";
import {
  AddonSlotsPreviewResponse,
  CancelSubscriptionResponse,
  CurrentSubscriptionResponse,
  SubscriptionCheckoutPayload,
  SubscriptionCheckoutResponse,
  SubscriptionPlansResponse,
  UpdateAddonSlotsPayload,
  UpdateAddonSlotsResponse,
} from "@/types/subscription";

export const subscriptionService = {
  getPlans: async () => {
    const { data } = await apiClient.get<SubscriptionPlansResponse>("/subscription/plans");
    return data;
  },

  getCurrentSubscription: async () => {
    const { data } = await apiClient.get<CurrentSubscriptionResponse>("/subscription/me");
    return data;
  },

  checkoutPlan: async (payload: SubscriptionCheckoutPayload) => {
    const { data } = await apiClient.post<SubscriptionCheckoutResponse>(
      "/subscription/checkout",
      payload,
    );
    return data;
  },

  updateAddonSlots: async (payload: UpdateAddonSlotsPayload) => {
    const { data } = await apiClient.patch<UpdateAddonSlotsResponse>(
      "/subscription/addon-slots",
      payload,
    );
    return data;
  },

  previewAddonSlots: async (payload: UpdateAddonSlotsPayload) => {
    const { data } = await apiClient.post<AddonSlotsPreviewResponse>(
      "/subscription/addon-slots/preview",
      payload,
    );
    return data;
  },

  cancelCurrentSubscription: async () => {
    const { data } = await apiClient.patch<CancelSubscriptionResponse>(
      "/subscription/cancel",
    );
    return data;
  },
};
