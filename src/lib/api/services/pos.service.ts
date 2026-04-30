import { apiClient } from "@/lib/api/client";
import {
  CreatePOSOrderPayload,
  CreatePOSPayload,
  CreatePOSResponse,
  POSListResponse,
  POSOrderResponse,
  SessionListResponse,
} from "@/types/pos";

export const posService = {
  createOrder: async (payload: CreatePOSOrderPayload) => {
    const { data } = await apiClient.post<POSOrderResponse>(
      "/pos/orders",
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

  listSessions: async () => {
    const { data } = await apiClient.get<SessionListResponse>("/sessions");
    return data;
  },

  forceLogoutSession: async (id: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/sessions/${id}`);
    return data;
  },
};
