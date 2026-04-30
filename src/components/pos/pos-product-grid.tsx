"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function resolveProductImageUrl(image?: string) {
  if (!image) {
    return null;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const normalizedPath = image.startsWith("/") ? image : `/${image}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

function ProductImage({ product }: { product: Product }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = resolveProductImageUrl(product.image);

  if (!imageUrl || hasError) {
    return <div className="mb-3 h-28 rounded-lg bg-muted" />;
  }

  return (
    <img
      src={imageUrl}
      alt={product.name}
      className="mb-3 h-28 w-full rounded-lg object-cover"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

interface POSProductGridProps {
  products: Product[];
  isLoading?: boolean;
  onAddToCart: (product: Product) => void;
}

export function POSProductGrid({
  products,
  isLoading,
  onAddToCart,
}: POSProductGridProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">Loading products...</div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">No products found.</div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <article
          key={product._id}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <ProductImage product={product} />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
          <h3 className="text-base font-semibold">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.stock} {product.unit} in stock
          </p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-lg font-semibold">${product.price.toFixed(2)}</p>
            <Button
              size="sm"
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
            >
              Add
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
