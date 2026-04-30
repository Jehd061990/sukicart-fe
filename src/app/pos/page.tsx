"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { POSCart } from "@/components/pos/pos-cart";
import { POSProductGrid } from "@/components/pos/pos-product-grid";
import { productService } from "@/lib/api/services/product.service";
import { posService } from "@/lib/api/services/pos.service";
import { usePOSCartStore } from "@/store/pos-cart.store";
import { useAuthStore } from "@/store/auth.store";

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [prescriptionCode, setPrescriptionCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const addItem = usePOSCartStore((state) => state.addItem);
  const items = usePOSCartStore((state) => state.items);
  const clearCart = usePOSCartStore((state) => state.clearCart);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getMine({ page: 1, limit: 50 }),
  });

  const storeConfigQuery = useQuery({
    queryKey: ["store-config", "me"],
    queryFn: () => posService.getStoreConfig(),
    enabled: role === "POS",
  });

  const storeConfig = storeConfigQuery.data?.config;
  const barcodeEnabled = Boolean(storeConfig?.features?.barcodeScanning);
  const prescriptionRequired = Boolean(
    storeConfig?.features?.prescriptionRequired,
  );
  const bulkActionsEnabled = Boolean(storeConfig?.features?.bulkQuantityInput);

  const submitMutation = useMutation({
    mutationFn: () =>
      posService.createOrder({
        paymentMethod: "cash",
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        prescriptionCode: prescriptionRequired ? prescriptionCode.trim() : "",
        scannedCode: barcodeEnabled ? barcodeInput.trim() : "",
      }),
    onSuccess: (result) => {
      clearCart();
      setPrescriptionCode("");
      setBarcodeInput("");
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
    const scanned = barcodeInput.trim().toLowerCase();

    if (!query && !scanned) {
      return allProducts;
    }

    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product._id.toLowerCase().includes(scanned) ||
        String(product.barcode || "")
          .toLowerCase()
          .includes(scanned),
    );
  }, [productsQuery.data?.products, search, barcodeInput]);

  if (role !== "POS") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="font-heading text-2xl font-semibold text-amber-900">
          POS Access Required
        </h1>
        <p className="mt-2 font-sans text-sm text-amber-800">
          This dashboard is only available to POS cashier accounts.
        </p>
        <Link
          href="/seller/pos"
          className="mt-4 inline-block rounded-md bg-amber-600 px-3 py-2 font-sans text-sm font-medium text-white hover:bg-amber-700"
        >
          Open Seller POS Management
        </Link>
      </section>
    );
  }

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
          {storeConfig ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {storeConfig.modules.map((moduleName) => (
                <span
                  key={moduleName}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-brand-200"
                >
                  {moduleName}
                </span>
              ))}
            </div>
          ) : null}
          <Input
            className="mt-3 border-brand-200 focus-visible:border-brand-500 focus-visible:ring-brand-100"
            placeholder="Search by product name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {barcodeEnabled ? (
            <Input
              className="mt-2 border-brand-200 focus-visible:border-brand-500 focus-visible:ring-brand-100"
              placeholder="Scan barcode or paste product code"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") {
                  return;
                }

                const normalized = barcodeInput.trim().toLowerCase();
                if (!normalized) {
                  return;
                }

                const matched = (productsQuery.data?.products || []).find(
                  (product) =>
                    String(product.barcode || "").toLowerCase() === normalized,
                );

                if (matched && matched.stock > 0) {
                  addItem(matched);
                  setBarcodeInput("");
                }
              }}
            />
          ) : null}
          {prescriptionRequired ? (
            <Input
              className="mt-2 border-brand-200 focus-visible:border-brand-500 focus-visible:ring-brand-100"
              placeholder="Prescription code (required)"
              value={prescriptionCode}
              onChange={(e) => setPrescriptionCode(e.target.value)}
            />
          ) : null}
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
          prescriptionRequired={prescriptionRequired}
          prescriptionCode={prescriptionCode}
          enableBulkActions={bulkActionsEnabled}
          onSubmit={() => submitMutation.mutate()}
          isSubmitting={submitMutation.isPending}
        />
      </div>
    </div>
  );
}
