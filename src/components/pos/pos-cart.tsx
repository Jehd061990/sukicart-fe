"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "@/components/pos/quantity-input";
import { usePOSCartStore } from "@/store/pos-cart.store";

interface POSCartProps {
  onSubmit: () => void;
  isSubmitting?: boolean;
  prescriptionRequired?: boolean;
  prescriptionCode?: string;
  enableBulkActions?: boolean;
}

export function POSCart({
  onSubmit,
  isSubmitting,
  prescriptionRequired,
  prescriptionCode,
  enableBulkActions,
}: POSCartProps) {
  const items = usePOSCartStore((state) => state.items);
  const setQuantity = usePOSCartStore((state) => state.setQuantity);
  const removeItem = usePOSCartStore((state) => state.removeItem);
  const total = usePOSCartStore((state) => state.getTotal());

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cart</h2>
        <p className="text-sm text-muted-foreground">
          {itemCount.toFixed(2)} items
        </p>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No items yet. Add products from the grid.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.lineKey} className="rounded-lg border p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ${item.price.toFixed(2)} / {item.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">Variant: {item.variant}</p>
                  {item.note ? (
                    <p className="text-xs text-muted-foreground">Note: {item.note}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.lineKey)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <QuantityInput
                  value={item.quantity}
                  unit={item.unit}
                  max={item.maxStock}
                  enableBulkActions={enableBulkActions}
                  onChange={(value) => setQuantity(item.lineKey, value)}
                />
                <p className="font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 border-t pt-4">
        {prescriptionRequired ? (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-medium">Prescription code required</p>
            <p className="mt-1">
              Enter the code in the POS header input before submitting the order.
            </p>
            <p className="mt-1 font-medium">
              Current value: {prescriptionCode?.trim() || "(empty)"}
            </p>
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-semibold">${total.toFixed(2)}</p>
        </div>

        <Button
          className="w-full"
          disabled={
            items.length === 0 ||
            isSubmitting ||
            (prescriptionRequired && !String(prescriptionCode || "").trim())
          }
          onClick={onSubmit}
        >
          {isSubmitting ? "Submitting..." : "Submit POS Order"}
        </Button>
      </div>
    </section>
  );
}
