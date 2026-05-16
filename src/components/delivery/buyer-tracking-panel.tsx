"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { getTargetLocation } from "@/lib/delivery/tracking";
import { deliveryService } from "@/lib/api/services/delivery.service";
import { orderService } from "@/lib/api/services/order.service";
import {
  GeoLocation,
  LocationUpdatedEvent,
  TrackingUpdatedEvent,
} from "@/types/delivery";
import { MarketplaceOrder } from "@/types/order";
import { OrderStatusTimeline } from "@/components/delivery/order-status-timeline";
import { TrackingMap } from "@/components/delivery/tracking-map";

const ORDER_LIST_HEIGHT_PX = 420;
const ORDER_CARD_ESTIMATE_SIZE_PX = 128;
const ORDER_CARD_GAP_PX = 12;

const ORDER_STATUS_TONE: Partial<Record<MarketplaceOrder["status"], string>> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  searching_rider: "bg-indigo-100 text-indigo-800 border-indigo-300",
  accepted: "bg-sky-100 text-sky-800 border-sky-300",
  preparing: "bg-orange-100 text-orange-800 border-orange-300",
  ready_for_pickup: "bg-violet-100 text-violet-800 border-violet-300",
  assigned_to_rider: "bg-cyan-100 text-cyan-800 border-cyan-300",
  arrived_at_seller: "bg-blue-100 text-blue-800 border-blue-300",
  picked_up: "bg-teal-100 text-teal-800 border-teal-300",
  out_for_delivery: "bg-lime-100 text-lime-800 border-lime-300",
  arrived_at_buyer: "bg-emerald-100 text-emerald-800 border-emerald-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-green-100 text-green-800 border-green-300",
};

type BuyerOrderCardProps = {
  buyerOrder: MarketplaceOrder;
  onOpen: (order: MarketplaceOrder) => void;
  onTrack: (orderId: string) => void;
};

function BuyerOrderCard({ buyerOrder, onOpen, onTrack }: BuyerOrderCardProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300">
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate font-mono text-xs text-gray-500">
            {buyerOrder.id}
          </p>
          <Badge
            variant="secondary"
            className={
              ORDER_STATUS_TONE[buyerOrder.status] ||
              "bg-slate-100 text-slate-700 border-slate-300"
            }
          >
            {buyerOrder.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="font-heading text-base font-medium text-slate-900">
          PHP {buyerOrder.total.toFixed(2)}
        </p>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2 p-4 pt-1">
        <Button
          size="sm"
          className="flex-1 min-w-32"
          onClick={() => onOpen(buyerOrder)}
        >
          View Details
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 min-w-32"
          onClick={() => onTrack(buyerOrder.id)}
        >
          Start Tracking
        </Button>
      </CardContent>
    </Card>
  );
}

export function BuyerTrackingPanel() {
  const queryClient = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);
  const [liveRiderLocation, setLiveRiderLocation] =
    useState<GeoLocation | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const buyerOrdersQuery = useQuery({
    queryKey: ["buyer-orders", "latest"],
    queryFn: () => orderService.getMyOrders(150),
  });

  const buyerOrders = buyerOrdersQuery.data || [];

  const trackingQuery = useQuery({
    queryKey: ["buyer-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
    refetchInterval: activeOrderId ? 4000 : false,
  });

  const onTrackingUpdated = useCallback((payload: TrackingUpdatedEvent) => {
    setLiveOrder(payload);
  }, []);

  const onRiderLocationUpdate = useCallback((payload: LocationUpdatedEvent) => {
    setLiveRiderLocation(payload.location);
  }, []);

  const onOrderChanged = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["buyer-orders", "latest"],
    });
  }, [queryClient]);

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated,
    onRiderLocationUpdate,
    onOrderChanged,
  });

  const order = useMemo(() => {
    const queryOrder = trackingQuery.data?.order || null;
    if (!liveOrder) {
      return queryOrder;
    }

    if (!queryOrder) {
      return liveOrder;
    }

    const liveUpdatedAt = new Date(liveOrder.updatedAt || 0).getTime();
    const queryUpdatedAt = new Date(queryOrder.updatedAt || 0).getTime();

    return queryUpdatedAt >= liveUpdatedAt ? queryOrder : liveOrder;
  }, [liveOrder, trackingQuery.data?.order]);
  const targetLocation = getTargetLocation(order);
  const showRiderLocation = order?.status === "out_for_delivery";

  const mapState = useMemo(
    () => ({
      riderLocation: showRiderLocation
        ? liveRiderLocation || order?.riderLocation || null
        : null,
      sellerLocation: order?.sellerLocation || null,
      buyerLocation: order?.buyerLocation || null,
      targetLocation,
    }),
    [order, targetLocation, liveRiderLocation, showRiderLocation],
  );

  const parseError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message || fallback;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsCancelling(true);
      await orderService.cancelOrder(selectedOrder.id);
      toast.success("Order canceled");
      await buyerOrdersQuery.refetch();
      if (activeOrderId === selectedOrder.id) {
        setActiveOrderId("");
        setLiveOrder(null);
        setLiveRiderLocation(null);
      }
      closeModal();
    } catch (error) {
      toast.error(parseError(error, "Failed to cancel order"));
    } finally {
      setIsCancelling(false);
    }
  };

  const canCancelPending = selectedOrder?.status === "pending";

  const handleTrackOrder = (orderId: string) => {
    setActiveOrderId(orderId);
    setLiveOrder(null);
    setLiveRiderLocation(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-linear-to-b from-white to-slate-50 shadow-sm">
        <CardHeader className="space-y-2 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-medium text-slate-900 sm:text-2xl">
                My Orders
              </CardTitle>
              <p className="mt-1 font-sans text-base text-gray-600">
                Follow your order timeline with fast actions and live tracking.
              </p>
            </div>
            <Badge
              variant="secondary"
              className="w-fit border-slate-300 bg-white text-slate-700"
            >
              {buyerOrders.length} orders
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500">
              Order queue
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Open details or start live tracking from any card.
            </p>
          </div>

          {buyerOrdersQuery.isLoading ? (
            <p className="mt-4 font-sans text-sm text-gray-600">
              Loading orders...
            </p>
          ) : buyerOrdersQuery.isError ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Failed to load buyer orders.
            </p>
          ) : buyerOrders.length ? (
            <VirtualizedSimpleBarList
              items={buyerOrders}
              height={ORDER_LIST_HEIGHT_PX}
              estimateSize={ORDER_CARD_ESTIMATE_SIZE_PX}
              gap={ORDER_CARD_GAP_PX}
              overscan={6}
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70"
              getItemKey={(buyerOrder) => buyerOrder.id}
              renderItem={(buyerOrder) => (
                <BuyerOrderCard
                  buyerOrder={buyerOrder}
                  onOpen={setSelectedOrder}
                  onTrack={handleTrackOrder}
                />
              )}
            />
          ) : (
            <p className="mt-4 font-sans text-sm text-gray-600">
              No orders yet.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <TrackingMap {...mapState} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-heading text-xl font-medium">Tracking Info</h2>
            <p className="mt-2 font-sans text-sm text-gray-600">
              Order:{" "}
              {showRiderLocation
                ? order?.riderId || "Unassigned"
                : "Hidden until out_for_delivery"}
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Status:{" "}
              <span className="text-foreground">{order?.status || "-"}</span>
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Rider:{" "}
              <span className="text-foreground">
                {order?.riderId || "Unassigned"}
              </span>
            </p>
          </div>

          {order ? <OrderStatusTimeline status={order.status} /> : null}
        </div>
      </section>

      {trackingQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to fetch tracking details for this order.
        </p>
      ) : null}

      {selectedOrder ? (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/60 p-4">
          <div className="relative z-2001 w-full max-w-2xl rounded-xl border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-medium">
                  Order Details
                </h3>
                <p className="font-mono text-xs text-gray-500">
                  {selectedOrder.id}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3 font-sans text-sm text-gray-600">
              <p>
                <span className="font-sans text-xs text-gray-500">Status:</span>{" "}
                {selectedOrder.status}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">Total:</span>{" "}
                PHP {selectedOrder.total.toFixed(2)}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">
                  Created:
                </span>{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">Seller:</span>{" "}
                {selectedOrder.seller?.name || "Seller"}
              </p>
              {selectedOrder.sellerCancellationReason ? (
                <p>
                  <span className="font-sans text-xs text-gray-500">
                    Cancellation Reason:
                  </span>{" "}
                  {selectedOrder.sellerCancellationReason}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <h4 className="mb-2 font-heading text-lg font-medium">Items</h4>
              <SimplebarScroll className="max-h-60" contentClassName="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div
                    key={`${selectedOrder.id}-${item.productId}`}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p>PHP {item.lineTotal.toFixed(2)}</p>
                    </div>
                    <p className="font-sans text-xs text-gray-500">
                      Qty {item.quantity} • PHP {item.price.toFixed(2)} /{" "}
                      {item.unit}
                    </p>
                  </div>
                ))}
              </SimplebarScroll>
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveOrderId(selectedOrder.id);
                  setLiveOrder(null);
                  setLiveRiderLocation(null);
                  closeModal();
                }}
              >
                Track This Order
              </Button>

              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={!canCancelPending || isCancelling}
              >
                Cancel Order
              </Button>
            </div>

            {!canCancelPending ? (
              <p className="mt-3 font-sans text-xs text-gray-500">
                Cancel is only available while order status is pending.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
