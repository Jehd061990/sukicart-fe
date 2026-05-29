"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SellerPlanTier } from "@/types/saas-dashboard";
import { SELLER_SALES_SERIES } from "@/config/seller-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesOverviewChartProps {
  plan: SellerPlanTier;
  data?: Array<Record<string, number | string>>;
}

export function SalesOverviewChart({ plan, data: liveData }: SalesOverviewChartProps) {
  const data = liveData && liveData.length > 0 ? liveData : SELLER_SALES_SERIES[plan];
  const proSecondaryKey = data.some((entry) => typeof entry.profit === "number")
    ? "profit"
    : data.some((entry) => typeof entry.orders === "number")
      ? "orders"
      : null;
  const businessSecondaryKey = data.some((entry) => typeof entry.transfers === "number")
    ? "transfers"
    : data.some((entry) => typeof entry.orders === "number")
      ? "orders"
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {plan === "BUSINESS" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              {businessSecondaryKey ? (
                <Bar dataKey={businessSecondaryKey} fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              ) : null}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              {plan === "PRO" ? (
                <Line
                  type="monotone"
                  dataKey={proSecondaryKey || "profit"}
                  stroke="var(--color-chart-3)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              ) : null}
              {plan === "FREE" ? (
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ) : null}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
