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
  SessionListResponse,
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
