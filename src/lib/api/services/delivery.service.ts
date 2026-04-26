import { apiClient } from "@/lib/api/client";
import { DeliveryTrackingOrder, OrderStatus } from "@/types/delivery";

export const deliveryService = {
  getOrderTracking: async (orderId: string) => {
    const { data } = await apiClient.get<{ order: DeliveryTrackingOrder }>(
      `/orders/${orderId}/tracking`,
    );
    return data;
  },

  updateRiderLocation: async (orderId: string, lat: number, lng: number) => {
    const { data } = await apiClient.patch<{ order: DeliveryTrackingOrder }>(
      `/orders/${orderId}/rider-location`,
      { lat, lng },
    );
    return data;
  },

  updateSellerLocation: async (orderId: string, lat: number, lng: number) => {
    const { data } = await apiClient.patch<{ order: DeliveryTrackingOrder }>(
      `/orders/${orderId}/seller-location`,
      { lat, lng },
    );
    return data;
  },

  updateRiderOrderStatus: async (orderId: string, status: OrderStatus) => {
    const { data } = await apiClient.patch<{ order: DeliveryTrackingOrder }>(
      `/orders/${orderId}/rider-status`,
      { status },
    );
    return data;
  },
};
