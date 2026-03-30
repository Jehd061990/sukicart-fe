"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeliveryMap } from "@/components/delivery/delivery-map";
import { OrderStatusTimeline } from "@/components/delivery/order-status-timeline";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { deliveryService } from "@/lib/api/services/delivery.service";
import {
  GeoLocation,
  LocationUpdatedEvent,
  OrderStatus,
  RiderAssignedEvent,
} from "@/types/delivery";

const DEFAULT_LOCATION: GeoLocation = {
  lat: 14.5995,
  lng: 120.9842,
  updatedAt: null,
};

export default function DeliveriesPage() {
  const [orderInput, setOrderInput] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveLocation, setLiveLocation] = useState<GeoLocation | null>(null);
  const [liveAssignedRiderId, setLiveAssignedRiderId] = useState<string | null>(
    null,
  );

  const trackingQuery = useQuery({
    queryKey: ["delivery-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
  });

  const onLocationUpdated = useCallback((payload: LocationUpdatedEvent) => {
    setLiveLocation(payload.location);
  }, []);

  const onRiderAssigned = useCallback((payload: RiderAssignedEvent) => {
    setLiveAssignedRiderId(payload.riderId);
  }, []);

  useDeliverySocket({
    orderId: activeOrderId,
    onLocationUpdated,
    onRiderAssigned,
  });

  const isTracking = Boolean(activeOrderId);
  const order = trackingQuery.data?.order;

  const location = useMemo(() => {
    if (liveLocation) {
      return liveLocation;
    }

    if (order?.currentLocation?.lat && order?.currentLocation?.lng) {
      return order.currentLocation;
    }

    return DEFAULT_LOCATION;
  }, [liveLocation, order]);

  const status: OrderStatus = order?.status || "pending";
  const assignedRiderId = liveAssignedRiderId || order?.riderId || null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Delivery Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter an order id to monitor rider location and delivery progress in
          real time.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="Enter order id"
          />
          <Button
            onClick={() => {
              setActiveOrderId(orderInput.trim());
              setLiveLocation(null);
              setLiveAssignedRiderId(null);
            }}
            disabled={!orderInput.trim()}
          >
            Track Order
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <DeliveryMap location={location} />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              Lat:{" "}
              <strong className="text-foreground">
                {location.lat.toFixed(5)}
              </strong>
            </span>
            <span>
              Lng:{" "}
              <strong className="text-foreground">
                {location.lng.toFixed(5)}
              </strong>
            </span>
            <span>
              Updated:{" "}
              <strong className="text-foreground">
                {location.updatedAt
                  ? new Date(location.updatedAt).toLocaleTimeString()
                  : "-"}
              </strong>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">Tracking Info</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Order:{" "}
              <span className="text-foreground">{activeOrderId || "-"}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rider:{" "}
              <span className="text-foreground">
                {assignedRiderId || "Unassigned"}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Live:{" "}
              <span className="text-foreground">
                {isTracking ? "Connected" : "Idle"}
              </span>
            </p>
          </div>

          <OrderStatusTimeline status={status} />
        </div>
      </section>

      {trackingQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to fetch order tracking details. Please check the order id.
        </p>
      ) : null}
    </div>
  );
}
