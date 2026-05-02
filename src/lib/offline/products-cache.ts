import { ProductListResponse } from "@/types/product";
import { offlineDb } from "@/lib/offline/indexed-db";

export const cacheProducts = async (payload: ProductListResponse) => {
  await offlineDb.replaceProducts(payload.products);
};

export const getCachedProductsPayload = async (): Promise<ProductListResponse> => {
  const products = await offlineDb.getProducts<ProductListResponse["products"][number]>();

  return {
    products,
    pagination: {
      page: 1,
      limit: products.length,
      total: products.length,
      totalPages: 1,
    },
  };
};
