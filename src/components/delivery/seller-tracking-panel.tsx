"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { FALLBACK_LOCATION } from "@/lib/delivery/tracking";
import { deliveryService } from "@/lib/api/services/delivery.service";
import { OrderStatus, TrackingUpdatedEvent } from "@/types/delivery";
import { TrackingMap } from "@/components/delivery/tracking-map";

const STATUS_FLOW: OrderStatus[] = [
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

const isBeforePickedUp = (status?: OrderStatus) => {
  if (!status) {
    return false;
  }

  return STATUS_FLOW.indexOf(status) < STATUS_FLOW.indexOf("picked_up");
};

export function SellerTrackingPanel() {
  const [orderInput, setOrderInput] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);

  const trackingQuery = useQuery({
    queryKey: ["seller-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
  });

  const onTrackingUpdated = useCallback((payload: TrackingUpdatedEvent) => {
    setLiveOrder(payload);
  }, []);

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated,
  });

  const order = liveOrder || trackingQuery.data?.order || null;
  const riderApproaching = isBeforePickedUp(order?.status);

  const mapState = useMemo(
    () => ({
      riderLocation: riderApproaching
        ? order?.riderLocation || FALLBACK_LOCATION
        : null,
      sellerLocation: order?.sellerLocation || null,
      buyerLocation: null,
      targetLocation: order?.sellerLocation || null,
    }),
    [order, riderApproaching],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Seller Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track rider approach for pickup and monitor current order status.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={orderInput}
            onChange={(event) => setOrderInput(event.target.value)}
            placeholder="Enter seller order id"
          />
          <Button
            onClick={() => {
              setActiveOrderId(orderInput.trim());
              setLiveOrder(null);
            }}
            disabled={!orderInput.trim()}
          >
            Track Rider
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <TrackingMap {...mapState} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">Status</h2>
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

            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {riderApproaching ? "Rider is on the way" : "Pickup completed"}
            </div>
          </div>
        </div>
      </section>

      {trackingQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to fetch seller tracking details for this order.
        </p>
      ) : null}
    </div>
  );
}
