"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LazyInventoryImage } from "@/components/images/lazy-inventory-image";
import { inventoryService } from "@/lib/api/services/inventory.service";

export default function SellerInventorySyncPage() {
  const [search, setSearch] = useState("");
  const [stockDraftByProductId, setStockDraftByProductId] = useState<
    Record<string, string>
  >({});

  const inventoryQuery = useQuery({
    queryKey: ["seller-inventory", search],
    queryFn: () =>
      inventoryService.listMine({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
      }),
  });

  const updateStockMutation = useMutation({
    mutationFn: (payload: { productId: string; stock: number }) =>
      inventoryService.updateItem(payload.productId, {
        stock: payload.stock,
      }),
    onSuccess: () => {
      toast.success("Inventory updated");
      inventoryQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Failed to update inventory";

      toast.error(message);
    },
  });

  const rows = inventoryQuery.data?.data || [];

  return (
    <section className="space-y-4 rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-brand-100 p-6 shadow-sm">
      <div>
        <p className="inline-flex rounded-full bg-deal-100 px-3 py-1 font-sans text-xs font-medium text-deal-700">
          Inventory health
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          Seller Inventory Sync
        </h1>
        <p className="mt-2 font-sans text-sm text-gray-700">
          Inventory is tenant-scoped and synchronized with products for this seller only.
        </p>
      </div>

      <Input
        placeholder="Search product"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Update Stock</th>
            </tr>
          </thead>
          <tbody>
            {inventoryQuery.isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b">
                    <td className="px-3 py-2" colSpan={6}>
                      <div className="h-9 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              : null}
            {!inventoryQuery.isLoading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={6}>
                  No inventory records found.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const draft = stockDraftByProductId[row.productId] ?? String(row.stock);

              return (
                <tr key={row.id} className="border-b">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <LazyInventoryImage
                        name={row.product?.name || "Unknown"}
                        image={row.product?.image}
                        images={row.product?.images}
                        size={42}
                      />
                      <span>{row.product?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.product?.category || "-"}</td>
                  <td className="px-3 py-2">{row.product?.unit || "-"}</td>
                  <td className="px-3 py-2">{row.stock}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-24"
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(event) =>
                          setStockDraftByProductId((prev) => ({
                            ...prev,
                            [row.productId]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={updateStockMutation.isPending}
                        onClick={() => {
                          const parsed = Number(draft);
                          if (!Number.isFinite(parsed) || parsed < 0) {
                            toast.error("Stock must be a non-negative number");
                            return;
                          }

                          updateStockMutation.mutate({
                            productId: row.productId,
                            stock: parsed,
                          });
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
