import { apiClient } from "@/lib/api/client";
import {
  InventoryItemResponse,
  InventoryListResponse,
  UpdateInventoryPayload,
} from "@/types/inventory";

const toQueryString = (filters?: {
  page?: number;
  limit?: number;
  status?: "active" | "inactive" | "all";
  category?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();

  if (filters?.page) {
    params.set("page", String(filters.page));
  }

  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters?.category) {
    params.set("category", filters.category);
  }

  if (filters?.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const inventoryService = {
  listMine: async (filters?: {
    page?: number;
    limit?: number;
    status?: "active" | "inactive" | "all";
    category?: string;
    search?: string;
  }) => {
    const query = toQueryString(filters);
    const { data } = await apiClient.get<InventoryListResponse>(`/inventory${query}`);
    return data;
  },

  getItem: async (productId: string) => {
    const { data } = await apiClient.get<InventoryItemResponse>(
      `/inventory/${productId}`,
    );
    return data;
  },

  updateItem: async (productId: string, payload: UpdateInventoryPayload) => {
    const { data } = await apiClient.patch<{ message: string }>(
      `/inventory/${productId}`,
      payload,
    );
    return data;
  },
};
