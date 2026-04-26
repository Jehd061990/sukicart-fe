import { apiClient } from "@/lib/api/client";
import { NewOrderRequestEvent } from "@/types/delivery";
import {
  CheckoutOrderPayload,
  CreateOrderResponse,
  MarketplaceOrder,
  PickupQrPayload,
} from "@/types/order";

export const orderService = {
  createOrder: async (payload: CheckoutOrderPayload) => {
    const { data } = await apiClient.post<CreateOrderResponse>(
      "/orders",
      payload,
    );
    return data;
  },

  getMyOrders: async (limit = 30) => {
    const { data } = await apiClient.get<{ orders: MarketplaceOrder[] }>(
      `/orders/mine?limit=${limit}`,
    );
    return data.orders;
  },

  getPendingRiderOffer: async () => {
    const { data } = await apiClient.get<{
      offer: NewOrderRequestEvent | null;
    }>("/orders/rider/pending-offer");
    return data.offer;
  },

  acceptOrder: async (orderId: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/orders/${orderId}/accept`,
    );
    return data;
  },

  declineOrder: async (orderId: string, reason: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/orders/${orderId}/decline`,
      { reason },
    );
    return data;
  },

  cancelOrder: async (orderId: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/orders/${orderId}/cancel`,
    );
    return data;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/orders/${orderId}/status`,
      { status },
    );
    return data;
  },

  getPickupQr: async (orderId: string) => {
    const { data } = await apiClient.get<PickupQrPayload>(
      `/orders/${orderId}/pickup-qr`,
    );
    return data;
  },

  confirmPickupQr: async (
    orderId: string,
    payload: { pickupCode?: string; qrValue?: string },
  ) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/orders/${orderId}/confirm-pickup`,
      payload,
    );
    return data;
  },
};
