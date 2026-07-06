import type { Product } from "@/types/product";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const normalizeProductImageUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

export const resolveProductThumbnailUrl = (product: Pick<Product, "image" | "images">) => {
  const firstImage = product.images?.[0];
  return normalizeProductImageUrl(firstImage?.thumbnailUrl || firstImage?.url || product.image);
};

export const resolveProductFullImageUrl = (product: Pick<Product, "image" | "images">) => {
  const firstImage = product.images?.[0];
  return normalizeProductImageUrl(firstImage?.url || product.image);
};
