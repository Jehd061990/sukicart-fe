"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";
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

const ORDER_LIST_HEIGHT_PX = 440;
const ORDER_CARD_ESTIMATE_SIZE_PX = 142;
const ORDER_CARD_GAP_PX = 12;

const ORDER_STATUS_TONE: Partial<Record<MarketplaceOrder["status"], string>> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  searching_rider: "bg-indigo-100 text-indigo-800 border-indigo-300",
  accepted: "bg-sky-100 text-sky-800 border-sky-300",
  preparing: "bg-orange-100 text-orange-800 border-orange-300",
  ready_for_pickup: "bg-violet-100 text-violet-800 border-violet-300",
  assigned_to_rider: "bg-cyan-100 text-cyan-800 border-cyan-300",
  arrived_at_seller: "bg-blue-100 text-blue-800 border-blue-300",
  picked_up: "bg-teal-100 text-teal-800 border-teal-300",
  out_for_delivery: "bg-lime-100 text-lime-800 border-lime-300",
  arrived_at_buyer: "bg-emerald-100 text-emerald-800 border-emerald-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-green-100 text-green-800 border-green-300",
};

type OrderCardProps = {
  orderItem: MarketplaceOrder;
  isTrackable: boolean;
  onOpenOrder: (order: MarketplaceOrder) => void;
  onTrackOrder: (orderId: string) => void;
};

function OrderCard({
  orderItem,
  isTrackable,
  onOpenOrder,
  onTrackOrder,
}: OrderCardProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300">
      <CardHeader className="space-y-3 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500">
              Order ID
            </p>
            <p className="truncate font-mono text-xs text-gray-500">
              {orderItem.id}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={
              ORDER_STATUS_TONE[orderItem.status] ||
              "bg-slate-100 text-slate-700 border-slate-300"
            }
          >
            {orderItem.status.replaceAll("_", " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-sans text-xs text-gray-500">Buyer</p>
            <p className="truncate font-heading text-base font-medium text-slate-900">
              {orderItem.buyer?.name || "Buyer"}
            </p>
          </div>
          <div>
            <p className="font-sans text-xs text-gray-500">Total</p>
            <p className="font-heading text-base font-medium text-slate-900">
              PHP {orderItem.total.toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2 p-4 pt-1">
        <Button
          size="sm"
          className="flex-1 min-w-32"
          onClick={() => onOpenOrder(orderItem)}
        >
          View Details
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 min-w-32"
          onClick={() => onTrackOrder(orderItem.id)}
          disabled={!isTrackable}
        >
          {isTrackable ? "Track Rider" : "Not Trackable"}
        </Button>
      </CardContent>
    </Card>
  );
}

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
    refetchInterval: activeOrderId ? 4000 : false,
  });

  const sellerOrdersQuery = useQuery({
    queryKey: ["seller-orders", "latest"],
    queryFn: () => orderService.getMyOrders(150),
    refetchInterval: 5000,
  });

  const sellerOrders = sellerOrdersQuery.data || [];

  const handleTrackOrder = (orderId: string) => {
    setActiveOrderId(orderId);
    setLiveOrder(null);
  };

  const handleOpenOrder = (orderItem: MarketplaceOrder) => {
    setSelectedOrder(orderItem);
    setPickupQrData(null);
  };

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

  const order = useMemo(() => {
    const queryOrder = trackingQuery.data?.order || null;
    if (!liveOrder) {
      return queryOrder;
    }

    if (!queryOrder) {
      return liveOrder;
    }

    const liveUpdatedAt = new Date(liveOrder.updatedAt || 0).getTime();
    const queryUpdatedAt = new Date(queryOrder.updatedAt || 0).getTime();

    return queryUpdatedAt >= liveUpdatedAt ? queryOrder : liveOrder;
  }, [liveOrder, trackingQuery.data?.order]);
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
      <Card className="border-slate-200 bg-linear-to-b from-white to-slate-50 shadow-sm">
        <CardHeader className="space-y-2 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-medium text-slate-900 sm:text-2xl">
                Live Seller Orders
              </CardTitle>
              <p className="mt-1 font-sans text-base text-gray-600">
                Designed for high-volume queues with smooth scrolling and
                instant actions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="border-slate-300 bg-white text-slate-700"
              >
                {sellerOrders.length} orders
              </Badge>
              <Badge
                variant="secondary"
                className="border-emerald-300 bg-emerald-50 text-emerald-700"
              >
                Auto-refresh 5s
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500">
              Order queue
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Tap a card to open details, or track active deliveries.
            </p>
          </div>

          {sellerOrdersQuery.isLoading ? (
            <p className="mt-4 font-sans text-sm text-gray-600">
              Loading seller orders...
            </p>
          ) : sellerOrdersQuery.isError ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Failed to load seller orders. Please refresh and ensure backend is
              running with latest changes.
            </p>
          ) : sellerOrders.length ? (
            <VirtualizedSimpleBarList
              items={sellerOrders}
              height={ORDER_LIST_HEIGHT_PX}
              estimateSize={ORDER_CARD_ESTIMATE_SIZE_PX}
              gap={ORDER_CARD_GAP_PX}
              overscan={6}
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70"
              getItemKey={(orderItem) => orderItem.id}
              renderItem={(orderItem) => (
                <OrderCard
                  orderItem={orderItem}
                  isTrackable={canTrackRider(orderItem.status)}
                  onOpenOrder={handleOpenOrder}
                  onTrackOrder={handleTrackOrder}
                />
              )}
            />
          ) : (
            <p className="mt-4 font-sans text-sm text-gray-600">
              No seller orders found yet.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <TrackingMap {...mapState} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-heading text-xl font-medium">Status</h2>
            <p className="mt-2 font-sans text-sm text-gray-600">
              Order:{" "}
              <span className="text-foreground">{activeOrderId || "-"}</span>
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Status:{" "}
              <span className="text-foreground">{order?.status || "-"}</span>
            </p>
            <p className="mt-1 font-sans text-sm text-gray-600">
              Rider:{" "}
              <span className="text-foreground">
                {order?.riderId || "Unassigned"}
              </span>
            </p>

            <p className="mt-1 font-sans text-sm text-gray-600">
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
              <p className="mt-1 font-sans text-xs text-gray-500">
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
          <div className="relative z-2001 w-full max-w-2xl rounded-xl border bg-card p-5 shadow-xl overflow-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-medium">
                  Order Details
                </h3>
                <p className="font-mono text-xs text-gray-500">
                  {selectedOrder.id}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3 font-sans text-sm text-gray-600">
              <p>
                <span className="font-sans text-xs text-gray-500">Buyer:</span>{" "}
                {selectedOrder.buyer?.name || "Buyer"}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">Status:</span>{" "}
                {selectedOrder.status}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">Total:</span>{" "}
                PHP {selectedOrder.total.toFixed(2)}
              </p>
              <p>
                <span className="font-sans text-xs text-gray-500">
                  Created:
                </span>{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
              {statusMismatchDebugInfo ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  Debug status mismatch: {statusMismatchDebugInfo}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <h4 className="mb-2 font-heading text-lg font-medium">Items</h4>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {selectedOrder.items.map((item) => (
                  <div
                    key={`${selectedOrder.id}-${item.productId}-${item.variant || "regular"}-${item.note || ""}`}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p>PHP {item.lineTotal.toFixed(2)}</p>
                    </div>
                    <p className="font-sans text-xs text-gray-500">
                      Qty {item.quantity} • PHP {item.price.toFixed(2)} /{" "}
                      {item.unit}
                    </p>
                    <p className="font-sans text-xs text-gray-500">
                      Variant: {item.variant || "Regular"}
                    </p>
                    {item.note ? (
                      <p className="font-sans text-xs text-gray-500">
                        Note: {item.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {canShowPickupQrCompat ? (
              <div className="mt-4 space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-heading text-lg font-medium">
                    Pickup QR Handoff
                  </h4>
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
                    <div className="space-y-1 font-sans text-sm text-gray-600">
                      <p>Rider can scan this QR or manually type this code.</p>
                      <p className="font-mono text-base font-semibold text-slate-900">
                        {pickupQrData.pickupVerificationCode}
                      </p>
                      {pickupQrData.issuedAt ? (
                        <p className="font-sans text-xs text-gray-500">
                          Issued:{" "}
                          {new Date(pickupQrData.issuedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="font-sans text-xs text-gray-500">
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
                  className="font-sans text-sm font-medium text-gray-600"
                  htmlFor="seller-cancel-reason"
                >
                  Cancellation reason (visible to buyer)
                </label>
                <textarea
                  id="seller-cancel-reason"
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 font-sans text-sm text-gray-600"
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
              <p className="mt-3 font-sans text-xs text-gray-500">
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
