"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { NewOrderRequestEvent, OrderStatusUpdateEvent } from "@/types/delivery";

interface UseRiderAssignmentSocketOptions {
  onNewOrderRequest?: (payload: NewOrderRequestEvent) => void;
  onOrderStatusUpdate?: (payload: OrderStatusUpdateEvent) => void;
}

export const useRiderAssignmentSocket = ({
  onNewOrderRequest,
  onOrderStatusUpdate,
}: UseRiderAssignmentSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.accessToken || state.token);

  useEffect(() => {
    if (!token) {
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

    socket.on("new_order_request", (payload: NewOrderRequestEvent) => {
      onNewOrderRequest?.(payload);
    });

    socket.on("order_status_update", (payload: OrderStatusUpdateEvent) => {
      onOrderStatusUpdate?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, onNewOrderRequest, onOrderStatusUpdate]);

  return socketRef;
};
