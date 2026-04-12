import { apiClient } from "@/lib/api/client";
import {
  AdminBuyer,
  AdminDashboardStats,
  AdminOrder,
  AdminRider,
  AdminSeller,
  CreateRiderPayload,
  OrderStatus,
  SellerReviewStatus,
} from "@/types/admin";

export const adminService = {
  getDashboardStats: async () => {
    const { data } = await apiClient.get<AdminDashboardStats>(
      "/admin/dashboard-stats",
    );
    return data;
  },

  getSellers: async () => {
    const { data } = await apiClient.get<{ sellers: AdminSeller[] }>(
      "/admin/sellers",
    );
    return data.sellers;
  },

  getSellerDetails: async (sellerProfileId: string) => {
    const { data } = await apiClient.get<{ seller: unknown }>(
      `/admin/sellers/${sellerProfileId}`,
    );
    return data.seller;
  },

  updateSellerStatus: async (
    sellerProfileId: string,
    status: SellerReviewStatus,
  ) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/admin/sellers/${sellerProfileId}/status`,
      { status },
    );
    return data;
  },

  getRiders: async () => {
    const { data } = await apiClient.get<{ riders: AdminRider[] }>(
      "/admin/riders",
    );
    return data.riders;
  },

  addRider: async (payload: CreateRiderPayload) => {
    const { data } = await apiClient.post<{ message: string }>(
      "/admin/riders",
      payload,
    );
    return data;
  },

  toggleRiderStatus: async (userId: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/admin/riders/${userId}/toggle-active`,
    );
    return data;
  },

  removeRider: async (userId: string) => {
    const { data } = await apiClient.delete<{ message: string }>(
      `/admin/riders/${userId}`,
    );
    return data;
  },

  getBuyers: async () => {
    const { data } = await apiClient.get<{ buyers: AdminBuyer[] }>(
      "/admin/buyers",
    );
    return data.buyers;
  },

  disableBuyer: async (userId: string) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/admin/buyers/${userId}/disable`,
    );
    return data;
  },

  getOrders: async (status: "all" | OrderStatus = "all") => {
    const query = status === "all" ? "" : `?status=${status}`;
    const { data } = await apiClient.get<{ orders: AdminOrder[] }>(
      `/admin/orders${query}`,
    );
    return data.orders;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/admin/orders/${orderId}/status`,
      { status },
    );
    return data;
  },
};
