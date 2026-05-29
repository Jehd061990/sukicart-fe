"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bike, CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { posService } from "@/lib/api/services/pos.service";
import { MarketplaceOrderStatus } from "@/types/order";
import { POSOnlineOrder } from "@/types/pos";

const STATUS_BUCKETS = {
  newOrders: new Set<MarketplaceOrderStatus>(["pending", "accepted"]),
  preparing: new Set<MarketplaceOrderStatus>(["preparing"]),
  ready: new Set<MarketplaceOrderStatus>(["ready_for_pickup", "arrived_at_seller"]),
  outForDelivery: new Set<MarketplaceOrderStatus>([
    "assigned_to_rider",
    "picked_up",
    "out_for_delivery",
    "arrived_at_buyer",
    "delivering",
  ]),
  completed: new Set<MarketplaceOrderStatus>(["delivered", "completed"]),
  cancelled: new Set<MarketplaceOrderStatus>(["cancelled_by_buyer", "declined_by_seller"]),
} as const;

type BucketKey = keyof typeof STATUS_BUCKETS;

const BUCKET_LABELS: Array<{ key: BucketKey; label: string }> = [
  { key: "newOrders", label: "New Orders" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "outForDelivery", label: "Out For Delivery" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_TEXT: Partial<Record<MarketplaceOrderStatus, string>> = {
  pending: "NEW_ORDER",
  accepted: "NEW_ORDER",
  preparing: "PREPARING",
  ready_for_pickup: "READY_FOR_PICKUP",
  assigned_to_rider: "RIDER_ASSIGNED",
  arrived_at_seller: "RIDER_ARRIVED",
  picked_up: "PICKED_UP",
  out_for_delivery: "OUT_FOR_DELIVERY",
  arrived_at_buyer: "OUT_FOR_DELIVERY",
  delivering: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  completed: "COMPLETED",
  cancelled_by_buyer: "CANCELLED",
  declined_by_seller: "CANCELLED",
  searching_rider: "RIDER_DISPATCHING",
};

const STATUS_CLASS: Partial<Record<MarketplaceOrderStatus, string>> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-amber-100 text-amber-800",
  preparing: "bg-orange-100 text-orange-800",
  ready_for_pickup: "bg-violet-100 text-violet-800",
  assigned_to_rider: "bg-cyan-100 text-cyan-800",
  arrived_at_seller: "bg-sky-100 text-sky-800",
  picked_up: "bg-teal-100 text-teal-800",
  out_for_delivery: "bg-lime-100 text-lime-800",
  arrived_at_buyer: "bg-lime-100 text-lime-800",
  delivering: "bg-lime-100 text-lime-800",
  delivered: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled_by_buyer: "bg-rose-100 text-rose-800",
  declined_by_seller: "bg-rose-100 text-rose-800",
  searching_rider: "bg-indigo-100 text-indigo-800",
};

const timeLabel = (value?: string) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const getBucket = (status: MarketplaceOrderStatus): BucketKey => {
  if (STATUS_BUCKETS.newOrders.has(status)) {
    return "newOrders";
  }
  if (STATUS_BUCKETS.preparing.has(status)) {
    return "preparing";
  }
  if (STATUS_BUCKETS.ready.has(status)) {
    return "ready";
  }
  if (STATUS_BUCKETS.outForDelivery.has(status)) {
    return "outForDelivery";
  }
  if (STATUS_BUCKETS.completed.has(status)) {
    return "completed";
  }

  return "cancelled";
};

const playNewOrderTone = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio failures silently.
  }
};

export function OnlineOrdersPanel() {
  const queryClient = useQueryClient();
  const [activeBucket, setActiveBucket] = useState<BucketKey>("newOrders");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [transferTarget, setTransferTarget] = useState("");
  const knownNewOrderIdsRef = useRef<Set<string>>(new Set());

  const ordersQuery = useQuery({
    queryKey: ["pos-online-orders"],
    queryFn: () => posService.getOnlineOrderQueue({ limit: 200 }),
    refetchInterval: 5000,
  });

  const branchId = ordersQuery.data?.branchId;

  const orderDetailQuery = useQuery({
    queryKey: ["pos-online-order-detail", selectedOrderId, branchId],
    queryFn: () =>
      posService.getOnlineOrderDetail(selectedOrderId, {
        branchId,
      }),
    enabled: Boolean(selectedOrderId),
    staleTime: 3000,
  });

  const metricsQuery = useQuery({
    queryKey: ["pos-online-order-metrics", branchId],
    queryFn: () =>
      posService.getOnlineOrderMetrics({
        branchId,
      }),
    enabled: Boolean(branchId),
    refetchInterval: 15000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      posService.updateOnlineOrderStatus(orderId, {
        toStatus: status,
        branchId,
      }),
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["pos-online-orders"] });
      const previous = queryClient.getQueryData(["pos-online-orders"]);
      if (!previous) {
        return { previous };
      }

      queryClient.setQueryData(["pos-online-orders"], (current: unknown) => {
        if (!current || typeof current !== "object") {
          return current;
        }

        const typedCurrent = current as { orders?: POSOnlineOrder[] };
        if (!Array.isArray(typedCurrent.orders)) {
          return current;
        }

        return {
          ...typedCurrent,
          orders: typedCurrent.orders.map((orderItem) =>
            orderItem.id === orderId
              ? {
                  ...orderItem,
                  status,
                  updatedAt: new Date().toISOString(),
                }
              : orderItem,
          ),
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["pos-online-orders"], context.previous);
      }
      toast.error("Failed to update order status");
    },
    onSuccess: () => {
      toast.success("Order status updated");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pos-online-orders"] });
    },
  });

  useDeliverySocket({
    branchId,
    onOrderChanged: () => {
      void queryClient.invalidateQueries({ queryKey: ["pos-online-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-online-order-detail"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-online-order-metrics"] });
    },
  });

  const onlineOrders = useMemo(
    () => (ordersQuery.data?.orders || []).filter((orderItem) => orderItem.type === "ONLINE"),
    [ordersQuery.data?.orders],
  );

  const claimOrderMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      posService.claimOnlineOrder(orderId, { branchId }),
    onSuccess: () => {
      toast.success("Order claimed and moved to preparing");
      void queryClient.invalidateQueries({ queryKey: ["pos-online-orders"] });
    },
    onError: () => {
      toast.error("Order already claimed by another terminal");
      void queryClient.invalidateQueries({ queryKey: ["pos-online-orders"] });
    },
  });

  const transferOrderMutation = useMutation({
    mutationFn: ({ orderId, targetUserId }: { orderId: string; targetUserId: string }) =>
      posService.transferOnlineOrder(orderId, {
        targetUserId,
        branchId,
      }),
    onSuccess: () => {
      toast.success("Order transferred");
      setTransferTarget("");
      void queryClient.invalidateQueries({ queryKey: ["pos-online-orders"] });
    },
    onError: () => {
      toast.error("Failed to transfer order");
    },
  });

  const groupedOrders = useMemo(() => {
    return onlineOrders.reduce<Record<BucketKey, POSOnlineOrder[]>>(
      (acc, orderItem) => {
        const bucket = getBucket(orderItem.status as MarketplaceOrderStatus);
        acc[bucket].push(orderItem);
        return acc;
      },
      {
        newOrders: [],
        preparing: [],
        ready: [],
        outForDelivery: [],
        completed: [],
        cancelled: [],
      },
    );
  }, [onlineOrders]);

  const activeOrders = groupedOrders[activeBucket];
  const selectedOrder = onlineOrders.find((orderItem) => orderItem.id === selectedOrderId) || null;
  const detailedOrder = orderDetailQuery.data?.order || selectedOrder;
  const timeline = orderDetailQuery.data?.timeline || [];

  useEffect(() => {
    const currentNewIds = new Set(
      groupedOrders.newOrders.map((orderItem) => orderItem.id),
    );

    if (knownNewOrderIdsRef.current.size === 0) {
      knownNewOrderIdsRef.current = currentNewIds;
      return;
    }

    const fresh = [...currentNewIds].filter((id) => !knownNewOrderIdsRef.current.has(id));
    if (!fresh.length) {
      knownNewOrderIdsRef.current = currentNewIds;
      return;
    }

    const latest = groupedOrders.newOrders.find((orderItem) => orderItem.id === fresh[0]);
    if (latest) {
      toast("New Online Order", {
        description: `Order #${latest.id.slice(-6)} • ${latest.buyer?.name || "Customer"} • PHP ${latest.total.toFixed(2)}`,
        icon: <Bell className="h-4 w-4" />,
      });
      playNewOrderTone();
    }

    knownNewOrderIdsRef.current = currentNewIds;
  }, [groupedOrders.newOrders]);

  useEffect(() => {
    if (!selectedOrderId && activeOrders.length) {
      setSelectedOrderId(activeOrders[0].id);
    }
  }, [activeOrders, selectedOrderId]);

  const handleStatusUpdate = (orderId: string, status: string) => {
    updateOrderMutation.mutate({ orderId, status });
  };

  const branchHint = "Branch queue scope follows current POS account branch assignment.";

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Online Order Management</CardTitle>
          <CardDescription>
            Shared branch queue for all POS terminals. First terminal that prepares an order becomes handler.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">{branchHint}</p>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orders In Scope</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {metricsQuery.data?.counters.total ?? onlineOrders.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Avg Minutes To Ready</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {(metricsQuery.data?.kpi.avgMinutesToReady ?? 0).toFixed(1)}
              </p>
              <p className="text-[11px] text-slate-500">
                Samples: {metricsQuery.data?.kpi.readySamples ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stale Preparing</p>
              <p className="mt-1 text-xl font-semibold text-rose-700">
                {metricsQuery.data?.kpi.stalePreparingOrders ?? 0}
              </p>
              <p className="text-[11px] text-slate-500">Older than 20 minutes</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Queue Health</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {(metricsQuery.data?.counters.newOrders ?? groupedOrders.newOrders.length) +
                  (metricsQuery.data?.counters.preparing ?? groupedOrders.preparing.length)}
              </p>
              <p className="text-[11px] text-slate-500">New + Preparing orders</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {BUCKET_LABELS.map((bucket) => {
              const count = groupedOrders[bucket.key].length;
              const active = bucket.key === activeBucket;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() => setActiveBucket(bucket.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold">{bucket.label}</p>
                  <p className="text-xs">{count} orders</p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-3">
              {!activeOrders.length ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No orders in this queue.
                </p>
              ) : (
                activeOrders.map((orderItem) => {
                  const isSelected = orderItem.id === selectedOrderId;
                  return (
                    <button
                      key={orderItem.id}
                      type="button"
                      onClick={() => setSelectedOrderId(orderItem.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-brand-300 bg-brand-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">Order #{orderItem.id.slice(-8)}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            STATUS_CLASS[orderItem.status as MarketplaceOrderStatus] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STATUS_TEXT[orderItem.status as MarketplaceOrderStatus] || orderItem.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Customer: {orderItem.buyer?.name || "Guest"}</p>
                        <p>Payment: COD</p>
                        <p>Total: PHP {orderItem.total.toFixed(2)}</p>
                        <p>Order Time: {timeLabel(orderItem.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Assigned Staff: {orderItem.assignedHandler?.name || "Unassigned"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Order Details</CardTitle>
                <CardDescription>
                  Customer, timeline, rider and state transitions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!selectedOrder ? (
                  <p className="text-slate-500">Select an order to view details and actions.</p>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">{detailedOrder?.buyer?.name || "Customer"}</p>
                      <p className="text-xs text-slate-600">Order #{detailedOrder?.id || selectedOrder.id}</p>
                      <p className="text-xs text-slate-600">Created: {timeLabel(detailedOrder?.createdAt)}</p>
                      <p className="text-xs text-slate-600">Updated: {timeLabel(detailedOrder?.updatedAt)}</p>
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Items</p>
                      {(detailedOrder?.items || []).map((item) => (
                        <div key={`${detailedOrder?.id || selectedOrder.id}-${item.productId}`} className="flex items-center justify-between text-xs">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span>PHP {item.lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-slate-500">Timeline</p>
                        {orderDetailQuery.isFetching ? (
                          <p className="text-[11px] text-slate-400">Refreshing...</p>
                        ) : null}
                      </div>
                      {!timeline.length ? (
                        <p className="text-xs text-slate-500">No timeline entries yet.</p>
                      ) : (
                        timeline.map((event, index) => (
                          <div key={`${event.at}-${index}`} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                            <p className="text-xs font-medium text-slate-800">{event.label}</p>
                            <p className="text-[11px] text-slate-500">
                              {timeLabel(event.at)}{event.actorName ? ` • ${event.actorName}` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        className="justify-start"
                        onClick={() => {
                          if (selectedOrder.assignedHandler) {
                            handleStatusUpdate(selectedOrder.id, "preparing");
                            return;
                          }

                          claimOrderMutation.mutate({ orderId: selectedOrder.id });
                        }}
                        disabled={updateOrderMutation.isPending || claimOrderMutation.isPending}
                      >
                        <Clock3 className="mr-2 h-4 w-4" /> Prepare Order
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleStatusUpdate(selectedOrder.id, "ready_for_pickup")}
                        disabled={updateOrderMutation.isPending}
                      >
                        <PackageCheck className="mr-2 h-4 w-4" /> Mark Ready
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleStatusUpdate(selectedOrder.id, "assigned_to_rider")}
                        disabled={updateOrderMutation.isPending}
                      >
                        <Bike className="mr-2 h-4 w-4" /> Assign Rider
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleStatusUpdate(selectedOrder.id, "picked_up")}
                        disabled={updateOrderMutation.isPending}
                      >
                        <Truck className="mr-2 h-4 w-4" /> Mark Picked Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleStatusUpdate(selectedOrder.id, "completed")}
                        disabled={updateOrderMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Order
                      </Button>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Transfer Order</p>
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={transferTarget}
                          onChange={(event) => setTransferTarget(event.target.value)}
                          placeholder="Target staff user ID"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (!transferTarget.trim()) {
                              toast.error("Enter a target staff ID");
                              return;
                            }

                            transferOrderMutation.mutate({
                              orderId: selectedOrder.id,
                              targetUserId: transferTarget.trim(),
                            });
                          }}
                          disabled={transferOrderMutation.isPending}
                        >
                          Transfer
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Manager-only reassignment requires backend transfer endpoint.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Rider</p>
                      <p className="mt-1 text-xs text-slate-700">
                        Rider Name: {detailedOrder?.rider?.name || "Not assigned"}
                      </p>
                      <p className="text-xs text-slate-700">
                        Contact: {detailedOrder?.rider?.phoneNumber || "N/A"}
                      </p>
                      <p className="text-xs text-slate-700">
                        Current Status: {detailedOrder?.rider
                          ? detailedOrder.rider.isOnline
                            ? detailedOrder.rider.isAvailable
                              ? "Online - Available"
                              : "Online - Busy"
                            : "Offline"
                          : "Not assigned"}
                      </p>
                      <p className="text-xs text-slate-700">Estimated Arrival: -</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
