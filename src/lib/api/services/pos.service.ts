import { apiClient } from "@/lib/api/client";
import { AuthResponse } from "@/types/auth";
import {
  DecodeBarcodeFramePayload,
  DecodeBarcodeFrameResponse,
  CreatePOSOrderPayload,
  CreatePOSPayload,
  CreatePOSResponse,
  POSListResponse,
  POSOrderResponse,
  POSSalesPerformanceResponse,
  POSTaxSummaryResponse,
  SessionListResponse,
  POSOnlineOrderDetailResponse,
  POSOnlineOrderMetricsResponse,
  POSOnlineOrderQueueResponse,
  UpdatePOSPayload,
  UpgradePOSSlotsPayload,
  UpgradePOSSlotsResponse,
} from "@/types/pos";
import {
  StoreConfigResponse,
  UpdateStoreConfigPayload,
} from "@/types/store-config";

export const posService = {
  createOrder: async (payload: CreatePOSOrderPayload) => {
    const { data } = await apiClient.post<POSOrderResponse>(
      "/pos/orders",
      payload,
    );
    return data;
  },

  getOnlineOrderQueue: async (filters?: { branchId?: string; limit?: number }) => {
    const params = new URLSearchParams();

    if (filters?.branchId) {
      params.set("branchId", filters.branchId);
    }

    if (typeof filters?.limit === "number") {
      params.set("limit", String(filters.limit));
    }

    const query = params.toString();
    const { data } = await apiClient.get<POSOnlineOrderQueueResponse>(
      `/pos/orders/queue${query ? `?${query}` : ""}`,
    );
    return data;
  },

  getOnlineOrderMetrics: async (filters?: { branchId?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();

    if (filters?.branchId) {
      params.set("branchId", filters.branchId);
    }

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    const { data } = await apiClient.get<POSOnlineOrderMetricsResponse>(
      `/pos/orders/metrics${query ? `?${query}` : ""}`,
    );
    return data;
  },

  getOnlineOrderDetail: async (orderId: string, filters?: { branchId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.branchId) {
      params.set("branchId", filters.branchId);
    }

    const query = params.toString();
    const { data } = await apiClient.get<POSOnlineOrderDetailResponse>(
      `/pos/orders/${orderId}${query ? `?${query}` : ""}`,
    );
    return data;
  },

  claimOnlineOrder: async (orderId: string, payload?: { branchId?: string; expectedVersion?: number }) => {
    const { data } = await apiClient.post<{ message: string }>(`/pos/orders/${orderId}/claim`, payload || {});
    return data;
  },

  updateOnlineOrderStatus: async (
    orderId: string,
    payload: { toStatus: string; branchId?: string; expectedVersion?: number },
  ) => {
    const { data } = await apiClient.patch<{ message: string }>(`/pos/orders/${orderId}/status`, payload);
    return data;
  },

  transferOnlineOrder: async (
    orderId: string,
    payload: { targetUserId: string; reason?: string; branchId?: string },
  ) => {
    const { data } = await apiClient.post<{ message: string }>(`/pos/orders/${orderId}/transfer`, payload);
    return data;
  },

  getTaxSummaryReport: async (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    const { data } = await apiClient.get<POSTaxSummaryResponse>(
      `/pos/reports/tax-summary${query ? `?${query}` : ""}`,
    );
    return data;
  },

  getSalesPerformanceReport: async (filters?: {
    branchId?: string;
    preset?: "today" | "yesterday" | "custom";
    from?: string;
    to?: string;
  }) => {
    const params = new URLSearchParams();

    if (filters?.branchId) {
      params.set("branchId", filters.branchId);
    }

    if (filters?.preset) {
      params.set("preset", filters.preset);
    }

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    const { data } = await apiClient.get<POSSalesPerformanceResponse>(
      `/pos/reports/sales-performance${query ? `?${query}` : ""}`,
    );
    return data;
  },

  downloadTaxSummaryCsv: async (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    const response = await apiClient.get(
      `/pos/reports/tax-summary.csv${query ? `?${query}` : ""}`,
      { responseType: "blob" },
    );

    return response.data as Blob;
  },

  downloadTaxDetailedCsv: async (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();
    const response = await apiClient.get(
      `/pos/reports/tax-detailed.csv${query ? `?${query}` : ""}`,
      { responseType: "blob" },
    );

    return response.data as Blob;
  },

  decodeBarcodeFrame: async (payload: DecodeBarcodeFramePayload) => {
    const { data } = await apiClient.post<DecodeBarcodeFrameResponse>(
      "/pos/decode-frame",
      payload,
    );
    return data;
  },

  createPOSAccount: async (payload: CreatePOSPayload) => {
    const { data } = await apiClient.post<CreatePOSResponse>("/pos/create", payload);
    return data;
  },

  listPOSAccounts: async () => {
    const { data } = await apiClient.get<POSListResponse>("/pos/list");
    return data;
  },

  deactivatePOSAccount: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/pos/${id}`);
    return data;
  },

  updatePOSAccount: async (id: string, payload: UpdatePOSPayload) => {
    const { data } = await apiClient.put<{ message: string }>(`/pos/${id}`, payload);
    return data;
  },

  upgradePOSSlots: async (payload: UpgradePOSSlotsPayload) => {
    const { data } = await apiClient.post<UpgradePOSSlotsResponse>(
      "/pos/subscription/upgrade",
      payload,
    );
    return data;
  },

  listSessions: async () => {
    const { data } = await apiClient.get<SessionListResponse>("/sessions");
    return data;
  },

  forceLogoutSession: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/sessions/${id}`);
    return data;
  },

  getStoreConfig: async () => {
    const { data } = await apiClient.get<StoreConfigResponse>("/store-config/me");
    return data;
  },

  updateStoreConfig: async (payload: UpdateStoreConfigPayload) => {
    const { data } = await apiClient.patch<StoreConfigResponse>(
      "/store-config/me",
      payload,
    );
    return data;
  },

  launchPOSAccount: async (
    id: string,
    payload?: { deviceId?: string; deviceName?: string },
  ) => {
    const { data } = await apiClient.post<AuthResponse>(`/pos/${id}/launch`, payload || {});
    return data;
  },
};
