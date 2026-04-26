"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import {
  LocationUpdatedEvent,
  OrderChangedEvent,
  OrderStatusUpdateEvent,
  RiderAssignedEvent,
  TrackingUpdatedEvent,
} from "@/types/delivery";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

interface UseDeliverySocketOptions {
  orderId?: string;
  onLocationUpdated?: (payload: LocationUpdatedEvent) => void;
  onRiderLocationUpdate?: (payload: LocationUpdatedEvent) => void;
  onTrackingUpdated?: (payload: TrackingUpdatedEvent) => void;
  onRiderAssigned?: (payload: RiderAssignedEvent) => void;
  onOrderChanged?: (payload: OrderChangedEvent) => void;
}

export const useDeliverySocket = ({
  orderId,
  onLocationUpdated,
  onRiderLocationUpdate,
  onTrackingUpdated,
  onRiderAssigned,
  onOrderChanged,
}: UseDeliverySocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.accessToken || state.token);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socketUrl = (
      process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
    ).replace(/\/api\/?$/, "");

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    const subscribeToOrderRoom = () => {
      if (!orderId) {
        return;
      }

      socket.emit("order:subscribe", { orderId });
    };

    socket.on("connect", subscribeToOrderRoom);
    subscribeToOrderRoom();

    socket.on("order:trackingUpdated", (payload: TrackingUpdatedEvent) => {
      if (payload.orderId === orderId && onTrackingUpdated) {
        onTrackingUpdated(payload);
      }
    });

    socket.on("order:locationUpdated", (payload: LocationUpdatedEvent) => {
      if (payload.orderId === orderId && onLocationUpdated) {
        onLocationUpdated(payload);
      }
    });

    socket.on("rider-location-update", (payload: LocationUpdatedEvent) => {
      if (payload.orderId === orderId && onRiderLocationUpdate) {
        onRiderLocationUpdate(payload);
      }
    });

    socket.on("order:riderAssigned", (payload: RiderAssignedEvent) => {
      if (payload.orderId === orderId && onRiderAssigned) {
        onRiderAssigned(payload);
      }

      if (onOrderChanged) {
        onOrderChanged({
          orderId: payload.orderId,
          status: "assigned_to_rider",
          action: "rider_assigned",
        });
      }
    });

    socket.on("order:changed", (payload: OrderChangedEvent) => {
      if (onOrderChanged) {
        onOrderChanged(payload);
      }
    });

    socket.on("order_status_update", (payload: OrderStatusUpdateEvent) => {
      if (onOrderChanged) {
        onOrderChanged({
          orderId: payload.orderId,
          status: payload.status,
          action: "status_changed",
        });
      }
    });

    return () => {
      socket.off("connect", subscribeToOrderRoom);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    orderId,
    token,
    onLocationUpdated,
    onRiderLocationUpdate,
    onTrackingUpdated,
    onRiderAssigned,
    onOrderChanged,
  ]);

  return socketRef;
};
