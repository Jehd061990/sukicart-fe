import { apiClient } from "@/lib/api/client";
import { ProductListResponse } from "@/types/product";

export const productService = {
  getAll: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const { data } = await apiClient.get<ProductListResponse>(
      `/products${query}`,
    );
    return data;
  },
};
