"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { LocationUpdatedEvent, RiderAssignedEvent } from "@/types/delivery";

interface UseDeliverySocketOptions {
  orderId: string;
  onLocationUpdated: (payload: LocationUpdatedEvent) => void;
  onRiderAssigned?: (payload: RiderAssignedEvent) => void;
}

export const useDeliverySocket = ({
  orderId,
  onLocationUpdated,
  onRiderAssigned,
}: UseDeliverySocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!orderId || !token) {
      return;
    }

    const socketUrl = (
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"
    ).replace(/\/api\/?$/, "");

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("order:locationUpdated", (payload: LocationUpdatedEvent) => {
      if (payload.orderId === orderId) {
        onLocationUpdated(payload);
      }
    });

    socket.on("order:riderAssigned", (payload: RiderAssignedEvent) => {
      if (payload.orderId === orderId && onRiderAssigned) {
        onRiderAssigned(payload);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, token, onLocationUpdated, onRiderAssigned]);
};
