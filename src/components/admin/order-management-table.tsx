"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";
import { AdminOrder, OrderStatus } from "@/types/admin";

interface OrderManagementTableProps {
  orders: AdminOrder[];
  selectedStatus: "all" | OrderStatus;
  isLoading: boolean;
  isBusy: boolean;
  onChangeFilter: (status: "all" | OrderStatus) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statuses: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

const ORDER_LIST_HEIGHT_PX = 460;
const ORDER_CARD_ESTIMATE_SIZE_PX = 144;
const ORDER_CARD_GAP_PX = 12;

const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-sky-100 text-sky-800 border-sky-300",
  preparing: "bg-orange-100 text-orange-800 border-orange-300",
  ready_for_pickup: "bg-violet-100 text-violet-800 border-violet-300",
  assigned_to_rider: "bg-cyan-100 text-cyan-800 border-cyan-300",
  arrived_at_seller: "bg-blue-100 text-blue-800 border-blue-300",
  picked_up: "bg-teal-100 text-teal-800 border-teal-300",
  out_for_delivery: "bg-lime-100 text-lime-800 border-lime-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
};

type AdminOrderCardProps = {
  order: AdminOrder;
  isBusy: boolean;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
};

function AdminOrderCard({
  order,
  isBusy,
  onUpdateStatus,
}: AdminOrderCardProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500">
              Order ID
            </p>
            <p className="truncate font-mono text-xs text-gray-500">
              {order.id}
            </p>
          </div>
          <Badge variant="outline" className={ORDER_STATUS_TONE[order.status]}>
            {order.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-1">
        <div className="grid grid-cols-1 gap-2 font-sans text-sm text-gray-600 sm:grid-cols-2">
          <p>
            <span className="font-sans text-xs text-gray-500">Buyer:</span>{" "}
            {order.buyerName}
          </p>
          <p>
            <span className="font-sans text-xs text-gray-500">Seller:</span>{" "}
            {order.sellerName}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="font-sans text-sm text-gray-600">Update order status</p>
          <select
            disabled={isBusy}
            value={order.status}
            onChange={(event) =>
              onUpdateStatus(order.id, event.target.value as OrderStatus)
            }
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderManagementTable({
  orders,
  selectedStatus,
  isLoading,
  isBusy,
  onChangeFilter,
  onUpdateStatus,
}: OrderManagementTableProps) {
  return (
    <section
      id="orders"
      className="rounded-2xl border bg-linear-to-b from-white to-slate-50 p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-medium text-slate-900">
            Order Management
          </h2>
          <p className="font-sans text-base text-gray-600">
            Filter and update orders with a high-performance queue view.
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit border-slate-300 bg-white text-slate-700"
        >
          {orders.length} total
        </Badge>

        <label className="text-sm">
          <span className="mr-2 font-sans text-sm font-medium text-gray-600">
            Filter status:
          </span>
          <select
            value={selectedStatus}
            onChange={(event) =>
              onChangeFilter(event.target.value as "all" | OrderStatus)
            }
            className="rounded-lg border border-slate-300 bg-white px-2 py-1"
          >
            <option value="all">all</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-600">Loading orders...</p>
      ) : !orders.length ? (
        <p className="font-sans text-sm text-gray-600">
          No orders for this filter.
        </p>
      ) : (
        <VirtualizedSimpleBarList
          items={orders}
          height={ORDER_LIST_HEIGHT_PX}
          estimateSize={ORDER_CARD_ESTIMATE_SIZE_PX}
          gap={ORDER_CARD_GAP_PX}
          overscan={8}
          className="rounded-xl border border-slate-200 bg-slate-50/70"
          getItemKey={(order) => order.id}
          renderItem={(order) => (
            <AdminOrderCard
              order={order}
              isBusy={isBusy}
              onUpdateStatus={onUpdateStatus}
            />
          )}
        />
      )}
    </section>
  );
}
