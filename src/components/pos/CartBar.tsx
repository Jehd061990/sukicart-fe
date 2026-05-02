"use client";

interface CartBarProps {
  itemCount: number;
  total: number;
  onOpenCart: () => void;
}

export function CartBar({ itemCount, total, onOpenCart }: CartBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <button
        type="button"
        onClick={onOpenCart}
        className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-left text-white"
      >
        <span>
          <span className="block text-xs uppercase tracking-wide text-slate-300">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="block text-sm font-semibold">Open checkout</span>
        </span>
        <span className="text-base font-bold">PHP {total.toFixed(2)}</span>
      </button>
    </div>
  );
}
