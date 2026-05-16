"use client";

import { POSCartItem } from "@/store/pos-cart.store";
import { CartItem } from "@/components/pos/CartItem";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";

interface CheckoutModalProps {
  open: boolean;
  items: POSCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onOpenDiscount: () => void;
  onCheckout: () => void;
  onIncreaseItem: (lineKey: string) => void;
  onDecreaseItem: (lineKey: string) => void;
  onRemoveItem: (lineKey: string) => void;
}

export function CheckoutModal({
  open,
  items,
  subtotal,
  discount,
  total,
  isSubmitting,
  onClose,
  onOpenDiscount,
  onCheckout,
  onIncreaseItem,
  onDecreaseItem,
  onRemoveItem,
}: CheckoutModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[86vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white p-4 shadow-xl sm:h-auto sm:max-h-[85vh] sm:rounded-3xl sm:ring-1 sm:ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Checkout</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        <SimplebarScroll className="flex-1 pr-1" contentClassName="space-y-2">
          {items.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
              No items yet. Add products first.
            </p>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.lineKey}
                item={item}
                onIncrease={() => onIncreaseItem(item.lineKey)}
                onDecrease={() => onDecreaseItem(item.lineKey)}
                onRemove={() => onRemoveItem(item.lineKey)}
              />
            ))
          )}
        </SimplebarScroll>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>PHP {subtotal.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenDiscount}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
          >
            <span>Discount</span>
            <span>- PHP {discount.toFixed(2)}</span>
          </button>
          <div className="flex items-center justify-between text-base font-bold text-slate-900">
            <span>Total</span>
            <span>PHP {total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            disabled={items.length === 0 || isSubmitting}
            className="mt-2 h-12 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Processing..." : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
