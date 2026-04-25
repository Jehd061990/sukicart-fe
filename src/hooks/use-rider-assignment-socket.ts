"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import { NewOrderRequestEvent, OrderStatusUpdateEvent } from "@/types/delivery";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

interface UseRiderAssignmentSocketOptions {
  onNewOrderRequest?: (payload: NewOrderRequestEvent) => void;
  onOrderStatusUpdate?: (payload: OrderStatusUpdateEvent) => void;
}

export const useRiderAssignmentSocket = ({
  onNewOrderRequest,
  onOrderStatusUpdate,
}: UseRiderAssignmentSocketOptions) => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const token = useAuthStore((state) => state.accessToken || state.token);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socketUrl = (
      process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
    ).replace(/\/api\/?$/, "");

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    setSocketInstance(socket);

    socket.on("new_order_request", (payload: NewOrderRequestEvent) => {
      onNewOrderRequest?.(payload);
    });

    socket.on("order_status_update", (payload: OrderStatusUpdateEvent) => {
      onOrderStatusUpdate?.(payload);
    });

    return () => {
      socket.disconnect();
      setSocketInstance(null);
    };
  }, [token, onNewOrderRequest, onOrderStatusUpdate]);

  return socketInstance;
};
