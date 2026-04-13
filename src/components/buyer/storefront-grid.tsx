"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productService } from "@/lib/api/services/product.service";
import { useCartStore } from "@/store/cart.store";
import { Product, ProductCategory } from "@/types/product";
import { ProductCard } from "@/components/buyer/product-card";

const CATEGORY_OPTIONS: Array<ProductCategory | "all"> = [
  "all",
  "vegetables",
  "meat",
  "fish",
];

export function StorefrontGrid() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const addToCart = useCartStore((state) => state.addToCart);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);

  const productsQuery = useQuery({
    queryKey: ["buyer-storefront", page, search, category],
    queryFn: () =>
      productService.getStorefront({
        page,
        limit: 12,
        search: search || undefined,
        category: category === "all" ? undefined : category,
      }),
  });

  const products =
    productsQuery.data?.products.filter(
      (product) => product.status === "active" && product.stock > 0,
    ) || [];
  const pagination = productsQuery.data?.pagination;

  const closeDetails = () => {
    setSelectedProduct(null);
    setSelectedQuantity(1);
  };

  const addProductToCart = async (product: Product) => {
    addToCart({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  const addFromDetails = async () => {
    if (!selectedProduct) {
      return;
    }

    addToCart({
      productId: selectedProduct._id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
    });

    for (let i = 1; i < selectedQuantity; i += 1) {
      increaseQuantity(selectedProduct._id);
    }

    closeDetails();
  };

  const skeletons = useMemo(
    () => Array.from({ length: 8 }, (_, index) => ({ id: index })),
    [],
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">Storefront</h1>
        <p className="text-sm text-muted-foreground">
          Active and in-stock products from marketplace sellers.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search products"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={category === item ? "default" : "outline"}
            onClick={() => {
              setCategory(item);
              setPage(1);
            }}
          >
            {item}
          </Button>
        ))}
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {skeletons.map((skeleton) => (
            <div
              key={skeleton.id}
              className="animate-pulse rounded-xl border bg-background p-3"
            >
              <div className="h-36 rounded bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
              <div className="mt-3 h-8 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No products match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onAddToCart={addProductToCart}
              onViewDetails={(clickedProduct) => {
                setSelectedProduct(clickedProduct);
                setSelectedQuantity(1);
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pagination?.page || 1} of {pagination?.totalPages || 1}
        </span>
        <Button
          variant="outline"
          disabled={!pagination || page >= pagination.totalPages}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>{selectedProduct.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-64 overflow-hidden rounded-lg border bg-muted">
                {selectedProduct.image ? (
                  <Image
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    width={1024}
                    height={640}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>

              <p className="text-lg font-bold text-emerald-600">
                PHP {selectedProduct.price.toFixed(2)}
              </p>

              <p className="text-sm text-muted-foreground">
                {selectedProduct.description ||
                  `${selectedProduct.category} product sold per ${selectedProduct.unit}.`}
              </p>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedQuantity((prev) => Math.max(prev - 1, 1))
                    }
                  >
                    -
                  </Button>
                  <Badge variant="secondary">{selectedQuantity}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedQuantity((prev) =>
                        Math.min(prev + 1, selectedProduct.stock),
                      )
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDetails}>
                  Close
                </Button>
                <Button onClick={addFromDetails}>Add to Cart</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
