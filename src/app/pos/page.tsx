"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { POSCart } from "@/components/pos/pos-cart";
import { POSProductGrid } from "@/components/pos/pos-product-grid";
import { productService } from "@/lib/api/services/product.service";
import { posService } from "@/lib/api/services/pos.service";
import { usePOSCartStore } from "@/store/pos-cart.store";

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const addItem = usePOSCartStore((state) => state.addItem);
  const items = usePOSCartStore((state) => state.items);
  const clearCart = usePOSCartStore((state) => state.clearCart);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll(),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      posService.createOrder({
        paymentMethod: "cash",
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    onSuccess: (result) => {
      clearCart();
      setFeedback(`Order created: ${result.order._id}`);
      productsQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to submit order";
      setFeedback(message);
    },
  });

  const products = useMemo(() => {
    const allProducts = productsQuery.data?.products || [];
    const query = search.trim().toLowerCase();

    if (!query) {
      return allProducts;
    }

    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }, [productsQuery.data?.products, search]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-4 shadow-sm">
          <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 font-sans text-xs font-medium text-brand-700">
            Walk-in checkout
          </p>
          <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
            POS
          </h1>
          <p className="font-sans text-sm text-gray-700">
            Search products and build a walk-in customer order.
          </p>
          <Input
            className="mt-3 border-brand-200 focus-visible:border-brand-500 focus-visible:ring-brand-100"
            placeholder="Search by product name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <POSProductGrid
          products={products}
          isLoading={productsQuery.isLoading}
          onAddToCart={addItem}
        />
      </section>

      <div className="space-y-3">
        {feedback ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 font-sans text-sm text-gray-700">
            {feedback}
          </div>
        ) : null}
        <POSCart
          onSubmit={() => submitMutation.mutate()}
          isSubmitting={submitMutation.isPending}
        />
      </div>
    </div>
  );
}
