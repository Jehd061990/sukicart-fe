import { create } from "zustand";
import { offlineDb } from "@/lib/offline/indexed-db";
import { PrintStatus, ReceiptPayload } from "@/lib/pos-printing/types";

export interface FailedReceipt {
  id: string;
  receipt: ReceiptPayload;
  status: PrintStatus;
  reason: string;
  createdAt: string;
  lastTriedAt?: string;
  attempts: number;
}

interface POSPrintState {
  latestPrintStatus: PrintStatus | null;
  latestPrintMessage: string;
  failedReceipts: FailedReceipt[];
  hydrateFailedReceipts: () => Promise<void>;
  setLatestStatus: (status: PrintStatus, message: string) => void;
  enqueueFailedReceipt: (receipt: ReceiptPayload, status: PrintStatus, reason: string) => void;
  markRetried: (id: string, status: PrintStatus, reason: string) => void;
  removeFailedReceipt: (id: string) => void;
}

export const usePOSPrintStore = create<POSPrintState>()((set, get) => ({
  latestPrintStatus: null,
  latestPrintMessage: "",
  failedReceipts: [],
  hydrateFailedReceipts: async () => {
    const queue = await offlineDb.getFailedReceipts();
    set({ failedReceipts: queue.slice(0, 100) });
  },
  setLatestStatus: (status, message) =>
    set({
      latestPrintStatus: status,
      latestPrintMessage: message,
    }),
  enqueueFailedReceipt: (receipt, status, reason) => {
    const entry: FailedReceipt = {
      id: receipt.receiptId,
      receipt,
      status,
      reason,
      createdAt: new Date().toISOString(),
      attempts: 1,
    };

    set((state) => ({
      failedReceipts: [entry, ...state.failedReceipts.filter((item) => item.id !== entry.id)].slice(
        0,
        100,
      ),
    }));

    void offlineDb.upsertFailedReceipt(entry);
  },
  markRetried: (id, status, reason) => {
    set((state) => ({
      failedReceipts: state.failedReceipts.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }

        const next = {
          ...entry,
          status,
          reason,
          lastTriedAt: new Date().toISOString(),
          attempts: entry.attempts + 1,
        };

        void offlineDb.upsertFailedReceipt(next);
        return next;
      }),
    }));
  },
  removeFailedReceipt: (id) => {
    const existing = get().failedReceipts.find((entry) => entry.id === id);
    if (existing) {
      void offlineDb.removeFailedReceipt(existing.id);
    }

    set((state) => ({
      failedReceipts: state.failedReceipts.filter((entry) => entry.id !== id),
    }));
  },
}));
