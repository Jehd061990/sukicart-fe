"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { FALLBACK_LOCATION, getTargetLocation } from "@/lib/delivery/tracking";
import { deliveryService } from "@/lib/api/services/delivery.service";
import {
  GeoLocation,
  LocationUpdatedEvent,
  TrackingUpdatedEvent,
} from "@/types/delivery";
import { OrderStatusTimeline } from "@/components/delivery/order-status-timeline";
import { TrackingMap } from "@/components/delivery/tracking-map";

export function BuyerTrackingPanel() {
  const [orderInput, setOrderInput] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);
  const [liveRiderLocation, setLiveRiderLocation] =
    useState<GeoLocation | null>(null);

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

  const mapState = useMemo(
    () => ({
      riderLocation:
        liveRiderLocation || order?.riderLocation || FALLBACK_LOCATION,
      sellerLocation: order?.sellerLocation || null,
      buyerLocation: order?.buyerLocation || null,
      targetLocation,
    }),
    [order, targetLocation, liveRiderLocation],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Buyer Delivery Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your rider in real time and monitor delivery progress.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={orderInput}
            onChange={(event) => setOrderInput(event.target.value)}
            placeholder="Enter your order id"
          />
          <Button
            onClick={() => {
              setActiveOrderId(orderInput.trim());
              setLiveOrder(null);
              setLiveRiderLocation(null);
            }}
            disabled={!orderInput.trim()}
          >
            Start Tracking
          </Button>
        </div>
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
              <span className="text-foreground">{activeOrderId || "-"}</span>
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
    </div>
  );
}
