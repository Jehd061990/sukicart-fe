"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { hasCoords } from "@/lib/delivery/tracking";
import { deliveryService } from "@/lib/api/services/delivery.service";
import { GeoLocation, TrackingUpdatedEvent } from "@/types/delivery";
import { OrderStatusTimeline } from "@/components/delivery/order-status-timeline";
import { RiderMap } from "@/components/delivery/rider-map";

export function RiderTrackingPanel() {
  const [orderInput, setOrderInput] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const trackingQuery = useQuery({
    queryKey: ["rider-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
  });

  const onTrackingUpdated = useCallback((payload: TrackingUpdatedEvent) => {
    setLiveOrder(payload);
  }, []);

  const socketRef = useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated,
  });

  const order = liveOrder || trackingQuery.data?.order || null;

  const handleRiderLocationUpdate = useCallback(
    async (location: GeoLocation) => {
      if (!activeOrderId) {
        return;
      }

      const lat = location.lat;
      const lng = location.lng;

      if (socketRef.current?.connected) {
        socketRef.current.emit(
          "update-location",
          { orderId: activeOrderId, lat, lng },
          (response: { success: boolean; message?: string }) => {
            if (!response?.success && response?.message) {
              setShareError(response.message);
            }
          },
        );
        return;
      }

      try {
        await deliveryService.updateRiderLocation(activeOrderId, lat, lng);
      } catch {
        setShareError("Unable to send location update.");
      }
    },
    [activeOrderId, socketRef],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Rider Live Map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seller location is shown before pickup, then buyer location after
          pickup.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={orderInput}
            onChange={(event) => setOrderInput(event.target.value)}
            placeholder="Enter assigned order id"
          />
          <Button
            onClick={() => {
              setActiveOrderId(orderInput.trim());
              setLiveOrder(null);
              setShareError(null);
            }}
            disabled={!orderInput.trim()}
          >
            Load Order
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <RiderMap
            orderStatus={order?.status}
            riderLocation={order?.riderLocation || null}
            sellerLocation={order?.sellerLocation || null}
            buyerLocation={order?.buyerLocation || null}
            onRiderLocationUpdate={handleRiderLocationUpdate}
            autoUpdateMs={5000}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">Trip Details</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Order:{" "}
              <span className="text-foreground">{activeOrderId || "-"}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Status:{" "}
              <span className="text-foreground">{order?.status || "-"}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Destination:{" "}
              <span className="text-foreground">
                {order?.targetType || "-"}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rider Signal:{" "}
              <span className="text-foreground">
                {hasCoords(order?.riderLocation) ? "Live" : "Waiting"}
              </span>
            </p>
          </div>

          {order ? <OrderStatusTimeline status={order.status} /> : null}
        </div>
      </section>

      {shareError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shareError}
        </p>
      ) : null}

      {trackingQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to fetch rider tracking details for this order.
        </p>
      ) : null}
    </div>
  );
}
