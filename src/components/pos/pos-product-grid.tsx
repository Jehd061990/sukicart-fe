"use client";

import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";

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
          <div className="mb-3 h-28 rounded-lg bg-muted" />
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
