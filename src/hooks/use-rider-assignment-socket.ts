"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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

interface RiderAssignmentSocketAPI {
  emit: (event: string, payload?: unknown) => void;
}

export const useRiderAssignmentSocket = ({
  onNewOrderRequest,
  onOrderStatusUpdate,
}: UseRiderAssignmentSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.accessToken || state.token);

  const emit = useCallback((event: string, payload?: unknown) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const socketApi = useMemo<RiderAssignmentSocketAPI | null>(
    () => (token ? { emit } : null),
    [emit, token],
  );

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

  return socketApi;
};
