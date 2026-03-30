import { apiClient } from "@/lib/api/client";
import { CreatePOSOrderPayload, POSOrderResponse } from "@/types/pos";

export const posService = {
  createOrder: async (payload: CreatePOSOrderPayload) => {
    const { data } = await apiClient.post<POSOrderResponse>(
      "/pos/orders",
      payload,
    );
    return data;
  },
};
