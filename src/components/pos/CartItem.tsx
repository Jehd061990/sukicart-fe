"use client";

import { POSCartItem } from "@/store/pos-cart.store";

interface CartItemProps {
  item: POSCartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export function CartItem({ item, onIncrease, onDecrease, onRemove }: CartItemProps) {
  return (
    <article className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">
            PHP {item.price.toFixed(2)} / {item.unit}
          </p>
          <p className="text-xs text-slate-500">Variant: {item.variant || "Regular"}</p>
          {item.note ? (
            <p className="text-xs text-slate-500">Note: {item.note}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-full bg-white ring-1 ring-slate-200">
          <button
            type="button"
            onClick={onDecrease}
            className="h-8 w-8 text-sm font-bold text-slate-700"
            aria-label={`Decrease ${item.name}`}
          >
            -
          </button>
          <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            className="h-8 w-8 text-sm font-bold text-slate-700"
            aria-label={`Increase ${item.name}`}
          >
            +
          </button>
        </div>
        <p className="text-sm font-bold text-slate-900">
          PHP {(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </article>
  );
}
