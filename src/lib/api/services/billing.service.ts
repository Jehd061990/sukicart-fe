import { apiClient } from "@/lib/api/client";
import {
  BillingHistoryResponse,
  BillingSummaryResponse,
  InvoicesResponse,
  PaymentTransactionsResponse,
} from "@/types/subscription";

export const billingService = {
  getSummary: async () => {
    const { data } = await apiClient.get<BillingSummaryResponse>("/billing/summary");
    return data;
  },

  listInvoices: async () => {
    const { data } = await apiClient.get<InvoicesResponse>("/billing/invoices");
    return data;
  },

  listHistory: async () => {
    const { data } = await apiClient.get<BillingHistoryResponse>("/billing/history");
    return data;
  },

  listTransactions: async () => {
    const { data } = await apiClient.get<PaymentTransactionsResponse>(
      "/billing/transactions",
    );
    return data;
  },
};
