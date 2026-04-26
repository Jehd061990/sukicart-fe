"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { orderService } from "@/lib/api/services/order.service";
import {
  getTargetLocation,
  isBuyerTargetStatus,
} from "@/lib/delivery/tracking";
import { deliveryService } from "@/lib/api/services/delivery.service";
import { OrderStatus, TrackingUpdatedEvent } from "@/types/delivery";
import { MarketplaceOrder, PickupQrPayload } from "@/types/order";
import { TrackingMap } from "@/components/delivery/tracking-map";

const TRACKABLE_ORDER_STATUSES = new Set<OrderStatus>([
  "accepted",
  "assigned_to_rider",
  "arrived_at_seller",
  "picked_up",
  "ready_for_pickup",
  "out_for_delivery",
]);

const PICKUP_QR_VISIBLE_STATUSES = new Set<OrderStatus>([
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
]);

const SELLER_LOCATION_SHARE_STATUSES = new Set<OrderStatus>([
  "pending",
  "searching_rider",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
  "picked_up",
  "out_for_delivery",
  "arrived_at_buyer",
]);

export function SellerTrackingPanel() {
  const queryClient = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState("");
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(
    null,
  );
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [showCancelReasonInput, setShowCancelReasonInput] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pickupQrData, setPickupQrData] = useState<PickupQrPayload | null>(
    null,
  );
  const [isLoadingPickupQr, setIsLoadingPickupQr] = useState(false);
  const [sellerLocationShareError, setSellerLocationShareError] = useState("");

  const trackingQuery = useQuery({
    queryKey: ["seller-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
  });

  const sellerOrdersQuery = useQuery({
    queryKey: ["seller-orders", "latest"],
    queryFn: () => orderService.getMyOrders(20),
  });

  const onTrackingUpdated = useCallback((payload: TrackingUpdatedEvent) => {
    setLiveOrder(payload);
  }, []);

  const onOrderChanged = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["seller-orders", "latest"],
    });
  }, [queryClient]);

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated,
    onOrderChanged,
  });

  const order = liveOrder || trackingQuery.data?.order || null;
  const targetLocation = getTargetLocation(order);
  const headingToBuyer = order?.status
    ? isBuyerTargetStatus(order.status)
    : false;

  const mapState = useMemo(
    () => ({
      riderLocation: order?.riderLocation || null,
      sellerLocation: order?.sellerLocation || null,
      buyerLocation: headingToBuyer ? order?.buyerLocation || null : null,
      targetLocation,
    }),
    [order, headingToBuyer, targetLocation],
  );

  const shouldShareSellerLocation =
    Boolean(activeOrderId) &&
    (!order || SELLER_LOCATION_SHARE_STATUSES.has(order.status));

  const hasLiveSellerLocation =
    Boolean(order?.sellerLocation) &&
    Number.isFinite(Number(order?.sellerLocation?.lat)) &&
    Number.isFinite(Number(order?.sellerLocation?.lng));

  const isSellerLocationSharingOn =
    shouldShareSellerLocation &&
    hasLiveSellerLocation &&
    !sellerLocationShareError;

  useEffect(() => {
    if (!shouldShareSellerLocation || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    const pushSellerLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          if (cancelled || !activeOrderId) {
            return;
          }

          try {
            await deliveryService.updateSellerLocation(
              activeOrderId,
              coords.latitude,
              coords.longitude,
            );
            setSellerLocationShareError("");
          } catch {
            setSellerLocationShareError(
              "Unable to share seller location for this order",
            );
          }
        },
        () => {
          if (!cancelled) {
            setSellerLocationShareError(
              "Location permission is required to share seller location",
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
      );
    };

    pushSellerLocation();
    const intervalId = window.setInterval(pushSellerLocation, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeOrderId, shouldShareSellerLocation]);

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
    setShowCancelReasonInput(false);
    setCancelReason("");
    setPickupQrData(null);
  };

  const handleLoadPickupQr = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsLoadingPickupQr(true);
      const data = await orderService.getPickupQr(selectedOrder.id);
      setPickupQrData(data);
      toast.success("Pickup QR loaded");
    } catch (error) {
      toast.error(parseError(error, "Failed to load pickup QR"));
    } finally {
      setIsLoadingPickupQr(false);
    }
  };

  const handlePrepareOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsUpdatingOrder(true);
      const response = (await orderService.updateOrderStatus(
        selectedOrder.id,
        "preparing",
      )) as { order?: { status?: MarketplaceOrder["status"] } };
      toast.success("Order is now preparing");
      await sellerOrdersQuery.refetch();
      setSelectedOrder({
        ...selectedOrder,
        status: response.order?.status || "preparing",
      });
      setActiveOrderId(selectedOrder.id);
      setLiveOrder(null);
    } catch (error) {
      toast.error(parseError(error, "Failed to set order as preparing"));
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleReadyOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsUpdatingOrder(true);
      const response = (await orderService.updateOrderStatus(
        selectedOrder.id,
        "ready_for_pickup",
      )) as { order?: { status?: MarketplaceOrder["status"] } };
      toast.success("Order marked as ready for pickup");
      await sellerOrdersQuery.refetch();
      setSelectedOrder({
        ...selectedOrder,
        status: response.order?.status || "ready_for_pickup",
      });
      setShowCancelReasonInput(false);
      setCancelReason("");
      setActiveOrderId(selectedOrder.id);
      setLiveOrder(null);
    } catch (error) {
      toast.error(parseError(error, "Failed to set order as ready"));
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    try {
      setIsUpdatingOrder(true);
      await orderService.declineOrder(selectedOrder.id, reason);
      toast.success("Order declined");
      await sellerOrdersQuery.refetch();
      if (activeOrderId === selectedOrder.id) {
        setActiveOrderId("");
        setLiveOrder(null);
      }
      closeModal();
    } catch (error) {
      toast.error(parseError(error, "Failed to decline order"));
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const canTrackRider = (status: MarketplaceOrder["status"]) =>
    TRACKABLE_ORDER_STATUSES.has(status as OrderStatus);

  const isAcceptedWithAssignedRider =
    selectedOrder?.status === "accepted" && Boolean(selectedOrder?.rider);

  const canPrepareOrder =
    selectedOrder &&
    (selectedOrder.status === "pending" ||
      selectedOrder.status === "searching_rider" ||
      (selectedOrder.status === "accepted" && !isAcceptedWithAssignedRider));

  const isPreparingOrder = selectedOrder?.status === "preparing";

  const isReadyOrBeyond =
    selectedOrder?.status === "ready_for_pickup" ||
    selectedOrder?.status === "assigned_to_rider" ||
    selectedOrder?.status === "arrived_at_seller" ||
    selectedOrder?.status === "picked_up" ||
    selectedOrder?.status === "out_for_delivery" ||
    selectedOrder?.status === "delivered" ||
    selectedOrder?.status === "completed";

  const canShowPickupQr =
    selectedOrder &&
    PICKUP_QR_VISIBLE_STATUSES.has(selectedOrder.status as OrderStatus);

  const latestSelectedOrder = selectedOrder
    ? sellerOrdersQuery.data?.find((item) => item.id === selectedOrder.id) ||
      null
    : null;

  useEffect(() => {
    if (!selectedOrder || !latestSelectedOrder) {
      return;
    }

    const selectedRiderId = selectedOrder.rider?.id || "";
    const latestRiderId = latestSelectedOrder.rider?.id || "";

    if (
      selectedOrder.status !== latestSelectedOrder.status ||
      selectedRiderId !== latestRiderId
    ) {
      setSelectedOrder(latestSelectedOrder);
    }
  }, [selectedOrder, latestSelectedOrder]);

  const statusMismatchDebugInfo =
    selectedOrder &&
    latestSelectedOrder &&
    selectedOrder.status !== latestSelectedOrder.status
      ? `Local: ${selectedOrder.status} | Latest API: ${latestSelectedOrder.status}`
      : null;

  const canShowPickupQrForLegacyAccepted =
    selectedOrder?.status === "accepted" && Boolean(selectedOrder?.rider);

  const canShowPickupQrCompat =
    canShowPickupQr || canShowPickupQrForLegacyAccepted;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Latest Seller Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders placed by buyers appear here and can be tracked instantly.
        </p>

        {sellerOrdersQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Loading seller orders...
          </p>
        ) : sellerOrdersQuery.isError ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to load seller orders. Please refresh and ensure backend is
            running with latest changes.
          </p>
        ) : sellerOrdersQuery.data?.length ? (
          <div className="mt-3 space-y-2">
            {sellerOrdersQuery.data.map((orderItem) => (
              <div
                key={orderItem.id}
                className="w-full rounded-lg border px-3 py-2"
              >
                <button
                  type="button"
                  className="w-full text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedOrder(orderItem);
                    setPickupQrData(null);
                  }}
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {orderItem.id}
                  </p>
                  <p className="text-sm font-medium">
                    {orderItem.buyer?.name || "Buyer"} • PHP{" "}
                    {orderItem.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {orderItem.status}
                  </p>
                </button>

                {canTrackRider(orderItem.status) ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveOrderId(orderItem.id);
                        setLiveOrder(null);
                      }}
                    >
                      Track Rider
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No seller orders found yet.
          </p>
        )}
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

            <p className="mt-1 text-sm text-muted-foreground">
              Seller Location Sharing:{" "}
              <span
                className={
                  isSellerLocationSharingOn
                    ? "font-medium text-emerald-600"
                    : "font-medium text-amber-600"
                }
              >
                {isSellerLocationSharingOn ? "ON" : "OFF"}
              </span>
            </p>

            {order?.sellerLocation?.updatedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last shared:{" "}
                {new Date(order.sellerLocation.updatedAt).toLocaleTimeString()}
              </p>
            ) : null}

            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {headingToBuyer
                ? "Rider is heading to buyer"
                : "Rider is heading to seller pickup"}
            </div>
          </div>
        </div>
      </section>

      {trackingQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to fetch seller tracking details for this order.
        </p>
      ) : null}

      {sellerLocationShareError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {sellerLocationShareError}
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
                <span className="text-muted-foreground">Buyer:</span>{" "}
                {selectedOrder.buyer?.name || "Buyer"}
              </p>
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
              {statusMismatchDebugInfo ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  Debug status mismatch: {statusMismatchDebugInfo}
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

            {canShowPickupQrCompat ? (
              <div className="mt-4 space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Pickup QR Handoff</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadPickupQr}
                    disabled={isLoadingPickupQr}
                  >
                    {pickupQrData ? "Refresh QR" : "Show QR"}
                  </Button>
                </div>

                {pickupQrData ? (
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="rounded-lg border bg-white p-2">
                      <QRCodeSVG
                        value={pickupQrData.pickupQrValue}
                        size={128}
                        includeMargin
                      />
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Rider can scan this QR or manually type this code.
                      </p>
                      <p className="font-mono text-base font-semibold">
                        {pickupQrData.pickupVerificationCode}
                      </p>
                      {pickupQrData.issuedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Issued:{" "}
                          {new Date(pickupQrData.issuedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click Show QR when the rider arrives at your location.
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveOrderId(selectedOrder.id);
                  setLiveOrder(null);
                  closeModal();
                }}
              >
                Track This Order
              </Button>

              <div className="flex gap-2">
                {isPreparingOrder ? (
                  <>
                    <Button
                      onClick={handleReadyOrder}
                      disabled={isUpdatingOrder}
                    >
                      Ready
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelReasonInput(true)}
                      disabled={isUpdatingOrder}
                    >
                      Cancel
                    </Button>
                  </>
                ) : canPrepareOrder ? (
                  <>
                    <Button
                      onClick={handlePrepareOrder}
                      disabled={isUpdatingOrder}
                    >
                      Prepare Order
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelReasonInput(true)}
                      disabled={isUpdatingOrder}
                    >
                      Decline
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {showCancelReasonInput && !isReadyOrBeyond ? (
              <div className="mt-4 space-y-2 rounded-lg border p-3">
                <label
                  className="text-sm font-medium"
                  htmlFor="seller-cancel-reason"
                >
                  Cancellation reason (visible to buyer)
                </label>
                <textarea
                  id="seller-cancel-reason"
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Please explain why this order is being cancelled"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelReasonInput(false);
                      setCancelReason("");
                    }}
                    disabled={isUpdatingOrder}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeclineOrder}
                    disabled={isUpdatingOrder}
                  >
                    Confirm Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {!canPrepareOrder ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {isReadyOrBeyond
                  ? "Order is already ready or in delivery flow."
                  : "This order cannot be moved to preparing from its current status."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
