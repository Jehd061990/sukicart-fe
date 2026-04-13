import { apiClient } from "@/lib/api/client";
import {
  CreateProductPayload,
  Product,
  ProductListFilters,
  ProductListResponse,
  UpdateProductPayload,
} from "@/types/product";

const toQueryString = (filters: ProductListFilters = {}) => {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const productService = {
  getAll: async (search?: string) => {
    return productService.getStorefront({
      search,
      page: 1,
      limit: 50,
    });
  },

  getStorefront: async (filters?: ProductListFilters) => {
    const query = toQueryString(filters);
    const { data } = await apiClient.get<ProductListResponse>(
      `/products${query}`,
    );
    return data;
  },

  getMine: async (filters?: ProductListFilters) => {
    const query = toQueryString(filters);
    const { data } = await apiClient.get<ProductListResponse>(
      `/products/mine${query}`,
    );
    return data;
  },

  create: async (payload: CreateProductPayload) => {
    const { data } = await apiClient.post<{ product: Product }>(
      "/products",
      payload,
    );
    return data.product;
  },

  update: async (productId: string, payload: UpdateProductPayload) => {
    const { data } = await apiClient.put<{ product: Product }>(
      `/products/${productId}`,
      payload,
    );
    return data.product;
  },

  remove: async (productId: string) => {
    const { data } = await apiClient.delete<{ message: string }>(
      `/products/${productId}`,
    );
    return data;
  },
};
