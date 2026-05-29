"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptHistoryEntry } from "@/lib/pos-printing/types";

type ReceiptFilterPreset = "today" | "yesterday" | "last_7_days" | "last_30_days" | "custom";

interface ReceiptHistoryPanelProps {
  receipts: ReceiptHistoryEntry[];
  onReprint: (receiptId: string) => void;
  canReprint: boolean;
  reprintDisabledMessage: string;
  reprintingReceiptId: string | null;
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getPresetRange = (preset: ReceiptFilterPreset): DateRange => {
  const now = new Date();

  if (preset === "yesterday") {
    const date = new Date(now);
    date.setDate(now.getDate() - 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  }

  if (preset === "last_7_days") {
    const end = endOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { from: startOfDay(start), to: end };
  }

  if (preset === "last_30_days") {
    const end = endOfDay(now);
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { from: startOfDay(start), to: end };
  }

  return { from: startOfDay(now), to: endOfDay(now) };
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const getStatusMeta = (status: ReceiptHistoryEntry["status"]) => {
  if (status === "PRINT_SUCCESS") {
    return { label: "Printed Successfully", icon: "✅", className: "text-emerald-700" };
  }

  if (status === "PRINT_FAILED") {
    return { label: "Print Failed", icon: "❌", className: "text-rose-700" };
  }

  return { label: "Pending Print", icon: "⏳", className: "text-amber-700" };
};

const getRangeLabel = (range: DateRange | undefined) => {
  if (!range?.from) {
    return "Select date range";
  }

  if (!range.to) {
    return range.from.toLocaleDateString();
  }

  return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`;
};

export function ReceiptHistoryPanel({
  receipts,
  onReprint,
  canReprint,
  reprintDisabledMessage,
  reprintingReceiptId,
}: ReceiptHistoryPanelProps) {
  const [preset, setPreset] = useState<ReceiptFilterPreset>("today");
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => getPresetRange("today"));
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [calendarMonths, setCalendarMonths] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setCalendarMonths(media.matches ? 2 : 1);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const applyPreset = (nextPreset: ReceiptFilterPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      setSelectedRange(getPresetRange(nextPreset));
      setIsRangePickerOpen(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    if (!selectedRange?.from || !selectedRange?.to) {
      return receipts;
    }

    const from = startOfDay(selectedRange.from).getTime();
    const to = endOfDay(selectedRange.to).getTime();

    return receipts.filter((entry) => {
      const created = Date.parse(entry.createdAt);
      return created >= from && created <= to;
    });
  }, [receipts, selectedRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRange?.from?.toISOString(), selectedRange?.to?.toISOString(), receipts.length]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, currentPage]);

  const exportFilteredReceiptsCsv = () => {
    if (!filteredReceipts.length || typeof window === "undefined") {
      return;
    }

    const rows = [
      [
        "receiptId",
        "orderId",
        "createdAt",
        "updatedAt",
        "total",
        "status",
        "message",
        "attempts",
        "cashier",
        "seller",
        "paymentMethod",
      ],
      ...filteredReceipts.map((entry) => [
        entry.id,
        entry.receipt.orderId,
        entry.createdAt,
        entry.updatedAt,
        entry.receipt.total.toFixed(2),
        entry.status,
        entry.message,
        String(entry.attempts),
        entry.receipt.cashierName,
        entry.receipt.sellerName,
        entry.receipt.paymentMethod || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const rangeLabel = useMemo(() => getRangeLabel(selectedRange), [selectedRange]);

  return (
    <div className="space-y-4 px-3 pb-3">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Receipt History</CardTitle>
          <CardDescription>
            View generated receipts, monitor print status, and reprint when printer is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant={preset === "today" ? "default" : "outline"} onClick={() => applyPreset("today")}>Today</Button>
            <Button type="button" variant={preset === "yesterday" ? "default" : "outline"} onClick={() => applyPreset("yesterday")}>Yesterday</Button>
            <Button type="button" variant={preset === "last_7_days" ? "default" : "outline"} onClick={() => applyPreset("last_7_days")}>Last 7 Days</Button>
            <Button type="button" variant={preset === "last_30_days" ? "default" : "outline"} onClick={() => applyPreset("last_30_days")}>Last 30 Days</Button>
            <Button
              type="button"
              variant={preset === "custom" ? "default" : "outline"}
              onClick={() => {
                setPreset("custom");
                setIsRangePickerOpen((prev) => !prev);
              }}
            >
              Custom Range
            </Button>
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 sm:w-auto"
              onClick={() => setIsRangePickerOpen((prev) => !prev)}
            >
              <CalendarRange className="h-4 w-4" />
              {rangeLabel}
            </Button>

            {isRangePickerOpen ? (
              <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:absolute sm:z-20 sm:w-auto">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date Range Picker</p>
                <div className="mt-3 rounded-lg border border-slate-200 p-2">
                  <DayPicker
                    mode="range"
                    numberOfMonths={calendarMonths}
                    selected={selectedRange}
                    onSelect={(nextRange) => {
                      setPreset("custom");
                      setSelectedRange(nextRange);
                    }}
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsRangePickerOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              Showing {paginatedReceipts.length} of {filteredReceipts.length} receipts
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={exportFilteredReceiptsCsv}
              disabled={!filteredReceipts.length}
            >
              Export CSV
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {!filteredReceipts.length ? (
              <p className="text-sm text-slate-500">No receipts found for the selected date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Receipt</th>
                      <th className="px-2 py-2">Order</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReceipts.map((entry) => {
                      const statusMeta = getStatusMeta(entry.status);
                      const disabled = !canReprint || reprintingReceiptId === entry.id;

                      return (
                        <tr key={entry.id} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-medium text-slate-700">{entry.id.slice(-10)}</td>
                          <td className="px-2 py-2 text-slate-700">{entry.receipt.orderId}</td>
                          <td className="px-2 py-2 text-slate-600">{formatDateTime(entry.createdAt)}</td>
                          <td className="px-2 py-2 text-slate-700">PHP {entry.receipt.total.toFixed(2)}</td>
                          <td className={`px-2 py-2 ${statusMeta.className}`}>
                            {statusMeta.icon} {statusMeta.label}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => onReprint(entry.id)}
                              disabled={disabled}
                              title={disabled ? reprintDisabledMessage : "Print/Reprint receipt"}
                              className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {reprintingReceiptId === entry.id ? "Printing..." : "Print/Reprint"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
