"use client";

import { useState } from "react";

const PROMO_OPTIONS = [
  { id: "weekday", label: "Weekday Saver", amount: 20 },
  { id: "lunch", label: "Lunch Rush", amount: 35 },
  { id: "bulk", label: "Bulk Basket", amount: 50 },
];

interface DiscountModalProps {
  open: boolean;
  subtotal: number;
  currentDiscount: number;
  onClose: () => void;
  onApply: (value: number) => void;
}

export function DiscountModal({
  open,
  subtotal,
  currentDiscount,
  onClose,
  onApply,
}: DiscountModalProps) {
  const [customAmount, setCustomAmount] = useState(
    String(currentDiscount || ""),
  );

  if (!open) {
    return null;
  }

  const applyAmount = (value: number) => {
    const safeValue = Math.max(0, Math.min(value, subtotal));
    onApply(safeValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Apply Discount</h3>
        <p className="mt-1 text-sm text-slate-500">Subtotal: PHP {subtotal.toFixed(2)}</p>

        <div className="mt-4 space-y-2">
          {PROMO_OPTIONS.map((promo) => (
            <button
              key={promo.id}
              type="button"
              onClick={() => applyAmount(promo.amount)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
            >
              <span className="font-medium text-slate-700">{promo.label}</span>
              <span className="font-bold text-brand-700">PHP {promo.amount.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Custom Discount
          </label>
          <input
            type="number"
            min={0}
            max={subtotal}
            step="0.01"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500"
            placeholder="0.00"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => applyAmount(Number(customAmount) || 0)}
            className="h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
