import { apiClient } from "@/lib/api/client";
import { DeliveryTrackingOrder } from "@/types/delivery";

export const deliveryService = {
  getOrderTracking: async (orderId: string) => {
    const { data } = await apiClient.get<{ order: DeliveryTrackingOrder }>(
      `/orders/${orderId}`,
    );
    return data;
  },
};
