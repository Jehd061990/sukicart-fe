"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { FALLBACK_LOCATION, getTargetLocation } from "@/lib/delivery/tracking";
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

export function BuyerTrackingPanel() {
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
    queryFn: () => orderService.getMyOrders(30),
  });

  const trackingQuery = useQuery({
    queryKey: ["buyer-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
  });

  const onTrackingUpdated = useCallback((payload: TrackingUpdatedEvent) => {
    setLiveOrder(payload);
  }, []);

  const onRiderLocationUpdate = useCallback((payload: LocationUpdatedEvent) => {
    setLiveRiderLocation(payload.location);
  }, []);

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated,
    onRiderLocationUpdate,
  });

  const order = liveOrder || trackingQuery.data?.order || null;
  const targetLocation = getTargetLocation(order);
  const showRiderLocation = order?.status === "out_for_delivery";

  const mapState = useMemo(
    () => ({
      riderLocation: showRiderLocation
        ? liveRiderLocation || order?.riderLocation || FALLBACK_LOCATION
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

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">My Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View your orders, check status, and open details.
        </p>

        {buyerOrdersQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Loading orders...
          </p>
        ) : buyerOrdersQuery.isError ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to load buyer orders.
          </p>
        ) : buyerOrdersQuery.data?.length ? (
          <div className="mt-3 space-y-2">
            {buyerOrdersQuery.data.map((buyerOrder) => (
              <div
                key={buyerOrder.id}
                className="w-full rounded-lg border px-3 py-2"
              >
                <button
                  type="button"
                  className="w-full text-left hover:bg-muted"
                  onClick={() => setSelectedOrder(buyerOrder)}
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {buyerOrder.id}
                  </p>
                  <p className="text-sm font-medium">
                    PHP {buyerOrder.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {buyerOrder.status}
                  </p>
                </button>

                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveOrderId(buyerOrder.id);
                      setLiveOrder(null);
                      setLiveRiderLocation(null);
                    }}
                  >
                    Start Tracking
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <TrackingMap {...mapState} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">Tracking Info</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Order:{" "}
                {showRiderLocation
                  ? order?.riderId || "Unassigned"
                  : "Hidden until out_for_delivery"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Status:{" "}
              <span className="text-foreground">{order?.status || "-"}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
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
                <h3 className="text-lg font-semibold">Order Details</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedOrder.id}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {selectedOrder.status}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span> PHP{" "}
                {selectedOrder.total.toFixed(2)}
              </p>
              <p>
                <span className="text-muted-foreground">Created:</span>{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="text-muted-foreground">Seller:</span>{" "}
                {selectedOrder.seller?.name || "Seller"}
              </p>
              {selectedOrder.sellerCancellationReason ? (
                <p>
                  <span className="text-muted-foreground">
                    Cancellation Reason:
                  </span>{" "}
                  {selectedOrder.sellerCancellationReason}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">Items</h4>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {selectedOrder.items.map((item) => (
                  <div
                    key={`${selectedOrder.id}-${item.productId}`}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p>PHP {item.lineTotal.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.quantity} • PHP {item.price.toFixed(2)} /{" "}
                      {item.unit}
                    </p>
                  </div>
                ))}
              </div>
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
              <p className="mt-3 text-xs text-muted-foreground">
                Cancel is only available while order status is pending.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
