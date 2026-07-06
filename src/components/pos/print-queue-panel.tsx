"use client";

import { FailedReceipt } from "@/store/pos-print.store";

interface PrintQueuePanelProps {
  receipts: FailedReceipt[];
  onRetry: (receiptId: string) => void;
  onRetryAll: () => void;
  onReconnect: () => void;
  onSavePdf: (receiptId: string) => void;
  onClose: () => void;
}

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

export function PrintQueuePanel({
  receipts,
  onRetry,
  onRetryAll,
  onReconnect,
  onSavePdf,
  onClose,
}: PrintQueuePanelProps) {
  if (!receipts.length) {
    return null;
  }

  return (
    <div className="fixed right-3 top-24 z-40 w-[min(560px,calc(100vw-24px))] rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-900">Print queue requires attention</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetryAll}
            className="rounded-md bg-amber-700 px-2 py-1 text-xs font-semibold text-white"
          >
            Retry All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-700"
            aria-label="Dismiss print queue notification"
          >
            X
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-amber-800">
        Queued receipts are stored offline and can be retried when printer connectivity is restored.
      </p>

      <div className="mt-2 space-y-2">
        {receipts.slice(0, 4).map((entry) => (
          <div key={entry.id} className="rounded-lg border border-amber-200 bg-white p-2 text-xs">
            <p className="font-medium text-slate-700">Order {entry.receipt.orderId}</p>
            <p className="text-slate-500">{entry.reason}</p>
            <p className="mt-1 text-slate-500">
              Attempts: {entry.attempts} | Last try: {formatDate(entry.lastTriedAt || entry.createdAt)}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onRetry(entry.id)}
                className="rounded-md bg-emerald-600 px-2 py-1 font-medium text-white"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => onSavePdf(entry.id)}
                className="rounded-md bg-slate-700 px-2 py-1 font-medium text-white"
              >
                Save PDF
              </button>
              <button
                type="button"
                onClick={onReconnect}
                className="rounded-md bg-amber-600 px-2 py-1 font-medium text-white"
              >
                Reconnect Printer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
