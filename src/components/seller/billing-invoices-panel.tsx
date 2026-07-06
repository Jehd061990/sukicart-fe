"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { billingService } from "@/lib/api/services/billing.service";

const toDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

export function BillingInvoicesPanel() {
  const billingSummaryQuery = useQuery({
    queryKey: ["seller-billing-summary"],
    queryFn: billingService.getSummary,
  });

  const invoicesQuery = useQuery({
    queryKey: ["seller-billing-invoices"],
    queryFn: billingService.listInvoices,
  });

  const billingHistoryQuery = useQuery({
    queryKey: ["seller-billing-history"],
    queryFn: billingService.listHistory,
  });

  const billingTransactionsQuery = useQuery({
    queryKey: ["seller-billing-transactions"],
    queryFn: billingService.listTransactions,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing and Invoices</CardTitle>
        <CardDescription>
          Latest invoice, payment transaction, and lifecycle history snapshots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Latest Invoice</p>
          <p className="text-sm font-medium">
            {billingSummaryQuery.data?.latestInvoice
              ? `PHP ${billingSummaryQuery.data.latestInvoice.amount} (${billingSummaryQuery.data.latestInvoice.status})`
              : "No invoices yet"}
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Latest Transaction</p>
          <p className="text-sm font-medium">
            {billingSummaryQuery.data?.latestTransaction
              ? `${billingSummaryQuery.data.latestTransaction.provider.toUpperCase()} ${billingSummaryQuery.data.latestTransaction.status}`
              : "No transactions yet"}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Invoices</p>
          {(invoicesQuery.data?.invoices || []).slice(0, 5).map((invoice) => (
            <div key={invoice._id} className="rounded-xl border p-2 text-sm">
              <p className="font-medium">PHP {invoice.amount}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.status.toUpperCase()} | {toDate(invoice.createdAt)}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Lifecycle History</p>
          {(billingHistoryQuery.data?.history || []).slice(0, 5).map((item) => (
            <div key={item._id} className="rounded-xl border p-2 text-sm">
              <p className="font-medium">
                {item.action} ({item.fromPlan || "-"} -&gt; {item.toPlan || "-"})
              </p>
              <p className="text-xs text-muted-foreground">{toDate(item.createdAt)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Payment Transactions</p>
          {(billingTransactionsQuery.data?.transactions || []).slice(0, 5).map((tx) => (
            <div key={tx._id} className="rounded-xl border p-2 text-sm">
              <p className="font-medium">PHP {tx.amount} - {tx.status.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{toDate(tx.createdAt)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}