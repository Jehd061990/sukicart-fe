"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => Promise<void> | void;
  onViewDetails: (product: Product) => void;
}

const getStockMeta = (stock: number) => {
  if (stock <= 0) {
    return { label: "Out of Stock", variant: "destructive" as const };
  }

  if (stock < 10) {
    return { label: "Low Stock", variant: "warning" as const };
  }

  return { label: "In Stock", variant: "success" as const };
};

export function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const stockMeta = getStockMeta(product.stock);

  const handleAddToCart = async () => {
    if (product.stock <= 0 || isAdding) {
      return;
    }

    setIsAdding(true);

    try {
      await onAddToCart(product);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onViewDetails(product)}
      >
        <div className="h-36 w-full overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={512}
              height={288}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </button>

      <CardContent className="space-y-2 pt-3">
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onViewDetails(product)}
        >
          <h3 className="truncate text-sm font-semibold" title={product.name}>
            {product.name}
          </h3>
        </button>

        <p className="text-sm font-bold text-emerald-600">
          PHP {product.price.toFixed(2)}
        </p>

        <Badge variant={stockMeta.variant}>{stockMeta.label}</Badge>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={product.stock === 0 || isAdding}
        >
          {isAdding
            ? "Adding..."
            : product.stock === 0
              ? "Out of Stock"
              : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}
