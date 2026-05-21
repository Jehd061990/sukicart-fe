import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PrintStatus, ReceiptPayload } from "@/lib/pos-printing/types";

export interface FailedReceipt {
  id: string;
  receipt: ReceiptPayload;
  status: PrintStatus;
  reason: string;
  createdAt: string;
  lastTriedAt?: string;
}

interface POSPrintState {
  latestPrintStatus: PrintStatus | null;
  latestPrintMessage: string;
  failedReceipts: FailedReceipt[];
  setLatestStatus: (status: PrintStatus, message: string) => void;
  enqueueFailedReceipt: (receipt: ReceiptPayload, status: PrintStatus, reason: string) => void;
  markRetried: (id: string, status: PrintStatus, reason: string) => void;
  removeFailedReceipt: (id: string) => void;
}

export const usePOSPrintStore = create<POSPrintState>()(
  persist(
    (set) => ({
      latestPrintStatus: null,
      latestPrintMessage: "",
      failedReceipts: [],
      setLatestStatus: (status, message) =>
        set({
          latestPrintStatus: status,
          latestPrintMessage: message,
        }),
      enqueueFailedReceipt: (receipt, status, reason) =>
        set((state) => ({
          failedReceipts: [
            {
              id: receipt.receiptId,
              receipt,
              status,
              reason,
              createdAt: new Date().toISOString(),
            },
            ...state.failedReceipts,
          ],
        })),
      markRetried: (id, status, reason) =>
        set((state) => ({
          failedReceipts: state.failedReceipts.map((entry) => {
            if (entry.id !== id) {
              return entry;
            }

            return {
              ...entry,
              status,
              reason,
              lastTriedAt: new Date().toISOString(),
            };
          }),
        })),
      removeFailedReceipt: (id) =>
        set((state) => ({
          failedReceipts: state.failedReceipts.filter((entry) => entry.id !== id),
        })),
    }),
    {
      name: "sukigo-pos-print-store",
      partialize: (state) => ({
        failedReceipts: state.failedReceipts,
        latestPrintStatus: state.latestPrintStatus,
        latestPrintMessage: state.latestPrintMessage,
      }),
    },
  ),
);
