"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { posService } from "@/lib/api/services/pos.service";

type SalesRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const getPresetRange = (preset: SalesRangePreset): DateRange => {
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

  if (preset === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      to: endOfDay(now),
    };
  }

  if (preset === "last_month") {
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayPreviousMonth = new Date(firstDayCurrentMonth.getTime() - 1);
    const firstDayPreviousMonth = new Date(
      lastDayPreviousMonth.getFullYear(),
      lastDayPreviousMonth.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    return {
      from: firstDayPreviousMonth,
      to: endOfDay(lastDayPreviousMonth),
    };
  }

  if (preset === "this_year") {
    return {
      from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      to: endOfDay(now),
    };
  }

  // today and custom fallback
  return {
    from: startOfDay(now),
    to: endOfDay(now),
  };
};

const MONTH_OPTIONS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

export function SalesPerformancePanel() {
  const [preset, setPreset] = useState<SalesRangePreset>("today");
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() =>
    getPresetRange("today"),
  );
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [calendarMonths, setCalendarMonths] = useState(2);

  const initialFrom = selectedRange?.from || new Date();
  const initialTo = selectedRange?.to || initialFrom;
  const [startMonth, setStartMonth] = useState(initialFrom.getMonth());
  const [startYear, setStartYear] = useState(initialFrom.getFullYear());
  const [endMonth, setEndMonth] = useState(initialTo.getMonth());
  const [endYear, setEndYear] = useState(initialTo.getFullYear());

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

  const fromDate = useMemo(
    () => (selectedRange?.from ? toDateInput(selectedRange.from) : ""),
    [selectedRange?.from],
  );
  const toDate = useMemo(
    () => (selectedRange?.to ? toDateInput(selectedRange.to) : ""),
    [selectedRange?.to],
  );

  const rangeLabel = useMemo(() => getRangeLabel(selectedRange), [selectedRange]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  }, []);

  const applyPreset = (nextPreset: SalesRangePreset) => {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      const nextRange = getPresetRange(nextPreset);
      setSelectedRange(nextRange);
      if (nextRange.from && nextRange.to) {
        setStartMonth(nextRange.from.getMonth());
        setStartYear(nextRange.from.getFullYear());
        setEndMonth(nextRange.to.getMonth());
        setEndYear(nextRange.to.getFullYear());
      }
    }
  };

  const applyMonthYearRange = () => {
    const from = new Date(startYear, startMonth, 1, 0, 0, 0, 0);
    const to = new Date(endYear, endMonth + 1, 0, 23, 59, 59, 999);

    if (to < from) {
      return;
    }

    setPreset("custom");
    setSelectedRange({ from, to });
  };

  const salesQuery = useQuery({
    queryKey: ["pos-sales-performance", preset, fromDate, toDate],
    queryFn: () =>
      posService.getSalesPerformanceReport({
        preset: preset === "today" || preset === "yesterday" ? preset : "custom",
        ...((preset === "custom" || preset === "last_7_days" || preset === "last_30_days" || preset === "this_month" || preset === "last_month" || preset === "this_year")
          ? {
              from: fromDate,
              to: toDate,
            }
          : {}),
      }),
    enabled: preset !== "custom" || Boolean(fromDate && toDate),
    refetchInterval: 30000,
  });

  const series = useMemo(() => salesQuery.data?.series || [], [salesQuery.data?.series]);

  return (
    <div className="space-y-4 px-3 pb-3">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Sales Dashboard</CardTitle>
          <CardDescription>
            Track sales from walk-in customers and online orders with dynamic date filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={preset === "today" ? "default" : "outline"}
              onClick={() => {
                applyPreset("today");
                setIsRangePickerOpen(false);
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              variant={preset === "yesterday" ? "default" : "outline"}
              onClick={() => {
                applyPreset("yesterday");
                setIsRangePickerOpen(false);
              }}
            >
              Yesterday
            </Button>
            <Button
              type="button"
              variant={preset === "custom" ? "default" : "outline"}
              onClick={() => {
                setPreset("custom");
              }}
            >
              Custom Range
            </Button>
          </div>

          {preset === "custom" ? (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRangePickerOpen((prev) => !prev)}
                className="w-full justify-start gap-2 sm:w-auto"
              >
                <CalendarRange className="h-4 w-4" />
                {rangeLabel}
              </Button>

              {isRangePickerOpen ? (
                <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:absolute sm:z-20 sm:w-auto">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date Range Picker</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("this_year")}>Whole Year</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("this_month")}>Whole Month</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last_7_days")}>Last 7 Days</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last_month")}>Last Month</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last_30_days")}>Last 30 Days</Button>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choose Start and End Month/Year</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-slate-200 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <select
                            value={startMonth}
                            onChange={(event) => setStartMonth(Number(event.target.value))}
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                          >
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={startYear}
                            onChange={(event) => setStartYear(Number(event.target.value))}
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                          >
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="rounded-md border border-slate-200 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">End</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <select
                            value={endMonth}
                            onChange={(event) => setEndMonth(Number(event.target.value))}
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                          >
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={endYear}
                            onChange={(event) => setEndYear(Number(event.target.value))}
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
                          >
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      <Button type="button" size="sm" onClick={applyMonthYearRange}>
                        Apply Month/Year Range
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 p-2">
                    <DayPicker
                      mode="range"
                      selected={selectedRange}
                      onSelect={(nextRange) => {
                        setPreset("custom");
                        setSelectedRange(nextRange);
                        if (nextRange?.from) {
                          setStartMonth(nextRange.from.getMonth());
                          setStartYear(nextRange.from.getFullYear());
                        }
                        if (nextRange?.to) {
                          setEndMonth(nextRange.to.getMonth());
                          setEndYear(nextRange.to.getFullYear());
                        }
                      }}
                      numberOfMonths={calendarMonths}
                      captionLayout="dropdown"
                      startMonth={new Date(Math.min(...yearOptions), 0)}
                      endMonth={new Date(Math.max(...yearOptions), 11)}
                      defaultMonth={selectedRange?.from || new Date()}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsRangePickerOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-2">
                <p className="text-xs text-slate-500">
                  Selected range: {rangeLabel}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Sales</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                PHP {(salesQuery.data?.totals.total || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Walk-In Sales</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">
                PHP {(salesQuery.data?.totals.walkIn || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Online Sales</p>
              <p className="mt-1 text-xl font-semibold text-indigo-700">
                PHP {(salesQuery.data?.totals.online || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orders</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {salesQuery.data?.totals.orders || 0}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {salesQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading sales trend...</p>
            ) : !series.length ? (
              <p className="text-sm text-slate-500">No sales in the selected range.</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `PHP ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="walkIn" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="online" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
