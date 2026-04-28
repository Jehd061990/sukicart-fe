"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";
import { useRiderAssignmentSocket } from "@/hooks/use-rider-assignment-socket";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { orderService } from "@/lib/api/services/order.service";
import { deliveryService } from "@/lib/api/services/delivery.service";
import { TrackingMap } from "@/components/delivery/tracking-map";
import {
  NewOrderRequestEvent,
  GeoLocation,
  OrderStatus,
  OrderStatusUpdateEvent,
  TrackingUpdatedEvent,
} from "@/types/delivery";
import { hasCoords } from "@/lib/delivery/tracking";

const ARRIVED_AT_BUYER_THRESHOLD_METERS = 120;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineMeters = (a: GeoLocation, b: GeoLocation) => {
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const toStatusLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const PICKUP_STATUSES: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
];

const PICKUP_VERIFICATION_STATUSES: OrderStatus[] = [
  "accepted",
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
];

const RECENT_REQUESTS_LIMIT = 150;
const REQUEST_LIST_HEIGHT_PX = 380;
const REQUEST_CARD_ESTIMATE_SIZE_PX = 140;
const REQUEST_CARD_GAP_PX = 12;

type RiderOfferHistoryItem = NewOrderRequestEvent & {
  receivedAt: string;
};

const extractCodeFromQr = (rawValue: string) => {
  const value = String(rawValue || "").trim();
  if (!value.includes("|")) {
    return value;
  }

  const parts = value.split("|");
  return String(parts[2] || "").trim();
};

export default function RiderAcceptOrderPage() {
  const [incomingOrder, setIncomingOrder] =
    useState<NewOrderRequestEvent | null>(null);
  const [recentOffers, setRecentOffers] = useState<RiderOfferHistoryItem[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isResponding, setIsResponding] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [latestStatus, setLatestStatus] = useState("waiting");
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [liveOrder, setLiveOrder] = useState<TrackingUpdatedEvent | null>(null);
  const [localRiderLocation, setLocalRiderLocation] =
    useState<GeoLocation | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [scannedQrValue, setScannedQrValue] = useState("");
  const [isVerifyingPickup, setIsVerifyingPickup] = useState(false);
  const [isUpdatingRiderStatus, setIsUpdatingRiderStatus] = useState<
    "arrived" | "complete" | null
  >(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerRafRef = useRef<number | null>(null);

  const pushRecentOffer = useCallback((payload: NewOrderRequestEvent) => {
    setRecentOffers((prev) => {
      const nextItem: RiderOfferHistoryItem = {
        ...payload,
        receivedAt: new Date().toISOString(),
      };

      const deduped = prev.filter((item) => item.orderId !== payload.orderId);
      return [nextItem, ...deduped].slice(0, RECENT_REQUESTS_LIMIT);
    });
  }, []);

  const onNewOrderRequest = useCallback(
    (payload: NewOrderRequestEvent) => {
      setIncomingOrder(payload);
      pushRecentOffer(payload);
      setSecondsLeft(payload.expiresInSec || 10);
      setIsResponding(false);
      setLatestStatus("incoming order");
    },
    [pushRecentOffer],
  );

  const onOrderStatusUpdate = useCallback(
    (payload: OrderStatusUpdateEvent) => {
      if (activeOrderId && payload.orderId === activeOrderId) {
        setLatestStatus(payload.status);
      }
    },
    [activeOrderId],
  );

  const assignmentSocket = useRiderAssignmentSocket({
    onNewOrderRequest,
    onOrderStatusUpdate,
  });

  const trackingQuery = useQuery({
    queryKey: ["rider-order-tracking", activeOrderId],
    queryFn: () => deliveryService.getOrderTracking(activeOrderId),
    enabled: Boolean(activeOrderId),
    refetchInterval: activeOrderId ? 5000 : false,
  });

  const pendingOfferQuery = useQuery({
    queryKey: ["rider-pending-offer"],
    queryFn: () => orderService.getPendingRiderOffer(),
    enabled: !activeOrderId,
    refetchInterval: !activeOrderId && !incomingOrder ? 4000 : false,
  });

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated: (payload) => setLiveOrder(payload),
    onOrderChanged: (payload) => {
      if (!activeOrderId || payload.orderId !== activeOrderId) {
        return;
      }

      setLatestStatus(payload.status);
      void trackingQuery.refetch();
    },
  });

  useEffect(() => {
    if (!incomingOrder || secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(prev - 1, 0);

        if (next === 0) {
          // Defer state updates outside this state updater callback.
          setTimeout(() => {
            setIncomingOrder(null);
            setIsResponding(false);
            toast.info("Order request expired. Waiting for the next offer.");
          }, 0);
        }

        return next;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [incomingOrder, secondsLeft]);

  useEffect(() => {
    if (!assignmentSocket || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextRiderLocation: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString(),
        };

        setLocalRiderLocation(nextRiderLocation);

        assignmentSocket.emit("rider_location_update", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        if (activeOrderId) {
          assignmentSocket.emit("rider:updateLocation", {
            orderId: activeOrderId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      },
      () => null,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [assignmentSocket, activeOrderId]);

  useEffect(() => {
    orderService
      .getMyOrders(5)
      .then((orders) => {
        const assigned = orders.find(
          (order) =>
            order.rider &&
            order.status !== "completed" &&
            order.status !== "delivered",
        );
        if (assigned) {
          setActiveOrderId(assigned.id);
          setLatestStatus(assigned.status);
          setIsMapVisible(true);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (activeOrderId || incomingOrder) {
      return;
    }

    const syncAssignedOrder = () => {
      orderService
        .getMyOrders(5)
        .then((orders) => {
          const assigned = orders.find(
            (order) =>
              order.rider &&
              order.status !== "completed" &&
              order.status !== "delivered",
          );

          if (assigned) {
            setIncomingOrder(null);
            setActiveOrderId(assigned.id);
            setLatestStatus(assigned.status);
            setIsMapVisible(true);
          }
        })
        .catch(() => null);
    };

    const intervalId = window.setInterval(syncAssignedOrder, 6000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeOrderId, incomingOrder]);

  useEffect(() => {
    if (incomingOrder || activeOrderId) {
      return;
    }

    const offer = pendingOfferQuery.data;
    if (!offer) {
      return;
    }

    setIncomingOrder(offer);
    pushRecentOffer(offer);
    setSecondsLeft(offer.expiresInSec || 10);
    setIsResponding(false);
    setLatestStatus("incoming order");
  }, [pendingOfferQuery.data, incomingOrder, activeOrderId, pushRecentOffer]);

  const trackedOrder = useMemo(() => {
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
  const riderLocation =
    localRiderLocation || trackedOrder?.riderLocation || null;
  const showPickupTarget = trackedOrder
    ? PICKUP_STATUSES.includes(trackedOrder.status)
    : true;
  const needsPickupVerification = trackedOrder
    ? PICKUP_VERIFICATION_STATUSES.includes(trackedOrder.status)
    : false;

  const mapState = useMemo(
    () => ({
      riderLocation: trackedOrder?.riderLocation || null,
      sellerLocation: trackedOrder?.sellerLocation || null,
      buyerLocation: showPickupTarget
        ? null
        : trackedOrder?.buyerLocation || null,
      targetLocation: showPickupTarget
        ? trackedOrder?.sellerLocation || null
        : trackedOrder?.buyerLocation || null,
    }),
    [trackedOrder, showPickupTarget],
  );

  const distanceToBuyerMeters = useMemo(() => {
    if (!hasCoords(riderLocation) || !hasCoords(trackedOrder?.buyerLocation)) {
      return null;
    }

    return haversineMeters(riderLocation!, trackedOrder!.buyerLocation!);
  }, [riderLocation, trackedOrder]);

  const canAttemptArrivalStatus =
    trackedOrder?.status === "out_for_delivery" ||
    trackedOrder?.status === "picked_up" ||
    trackedOrder?.status === "delivering";

  const canMarkArrivedAtBuyer =
    Boolean(activeOrderId) &&
    Boolean(trackedOrder) &&
    canAttemptArrivalStatus &&
    distanceToBuyerMeters !== null &&
    distanceToBuyerMeters <= ARRIVED_AT_BUYER_THRESHOLD_METERS;

  const canCompleteOrder =
    Boolean(activeOrderId) &&
    (trackedOrder?.status === "arrived_at_buyer" ||
      trackedOrder?.status === "delivered" ||
      trackedOrder?.status === "completed");

  const handleRiderStatusUpdate = async (nextStatus: OrderStatus) => {
    if (!activeOrderId) {
      return;
    }

    const action = nextStatus === "arrived_at_buyer" ? "arrived" : "complete";

    try {
      setIsUpdatingRiderStatus(action);
      const response = await deliveryService.updateRiderOrderStatus(
        activeOrderId,
        nextStatus,
      );

      if (response?.order) {
        setLiveOrder(response.order as TrackingUpdatedEvent);
        setLatestStatus(response.order.status);
      }

      toast.success(
        nextStatus === "arrived_at_buyer"
          ? "Marked as arrived at buyer"
          : "Order marked complete",
      );

      await trackingQuery.refetch();
    } catch {
      toast.error("Unable to update rider status");
    } finally {
      setIsUpdatingRiderStatus(null);
    }
  };

  const stopScanner = useCallback(() => {
    if (scannerRafRef.current !== null) {
      cancelAnimationFrame(scannerRafRef.current);
      scannerRafRef.current = null;
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScannerOpen(false);
  }, []);

  useEffect(() => {
    if (!isScannerOpen) {
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      try {
        setScannerError("");

        const BarcodeDetectorCtor = (
          globalThis as unknown as {
            BarcodeDetector?: new (options?: { formats?: string[] }) => {
              detect: (
                source: ImageBitmapSource,
              ) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!BarcodeDetectorCtor) {
          setScannerError("Camera QR scan is not supported in this browser");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

        const scan = async () => {
          if (cancelled || !videoRef.current) {
            return;
          }

          try {
            const results = await detector.detect(videoRef.current);
            const rawValue = results[0]?.rawValue;

            if (rawValue) {
              setScannedQrValue(rawValue);
              setPickupCode(extractCodeFromQr(rawValue));
              toast.success("QR scanned successfully");
              stopScanner();
              return;
            }
          } catch {
            // Ignore detector frame failures and keep scanning.
          }

          scannerRafRef.current = requestAnimationFrame(() => {
            void scan();
          });
        };

        await scan();
      } catch {
        setScannerError("Unable to access camera for QR scanning");
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScannerOpen, stopScanner]);

  const handleConfirmPickup = async () => {
    if (!activeOrderId) {
      return;
    }

    const manual = pickupCode.trim();
    const qr = scannedQrValue.trim();
    if (!manual && !qr) {
      toast.error("Scan QR or enter pickup code first");
      return;
    }

    try {
      setIsVerifyingPickup(true);
      await orderService.confirmPickupQr(activeOrderId, {
        pickupCode: manual || undefined,
        qrValue: qr || undefined,
      });
      toast.success("Pickup verified. Delivery is now in progress.");
      setLatestStatus("out_for_delivery");
      setLiveOrder(null);
      await trackingQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to verify pickup QR";
      toast.error(message);
    } finally {
      setIsVerifyingPickup(false);
    }
  };

  const respondToOrder = (decision: "accept_order" | "decline_order") => {
    if (!incomingOrder || !assignmentSocket) {
      return;
    }

    if (secondsLeft <= 0) {
      toast.error("This request has expired");
      setIncomingOrder(null);
      return;
    }

    setIsResponding(true);

    assignmentSocket.emit(
      decision,
      { orderId: incomingOrder.orderId },
      (response: { success: boolean; message?: string }) => {
        setIsResponding(false);

        if (!response?.success) {
          toast.error(response?.message || "Unable to process request");
          return;
        }

        if (decision === "accept_order") {
          setActiveOrderId(incomingOrder.orderId);
          setLatestStatus("accepted");
          setIsMapVisible(true);
          setLiveOrder(null);
          setPickupCode("");
          setScannedQrValue("");
          toast.success("Order accepted");
        } else {
          toast.info("Order declined. Searching for another rider.");
        }

        setIncomingOrder(null);
        setSecondsLeft(0);
      },
    );
  };

  const riderState = useMemo(() => {
    if (incomingOrder) {
      return "Incoming Order";
    }

    if (activeOrderId) {
      return "Delivering";
    }

    return "Waiting";
  }, [incomingOrder, activeOrderId]);

  return (
    <section className="space-y-4 rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          Rider Auto Assignment
        </h1>
        <p className="mt-2 font-sans text-base text-gray-700">
          Receive nearby order requests in real time and accept or decline.
        </p>
      </div>

      <div className="rounded-xl border border-brand-200 bg-background p-4">
        <p className="font-sans text-xs uppercase tracking-wide text-gray-500">
          Current State
        </p>
        <p className="mt-1 font-heading text-lg font-medium text-brand-900">
          {riderState}
        </p>
        <p className="mt-1 font-sans text-sm text-gray-700">
          Latest status: {toStatusLabel(latestStatus)}
        </p>
        {activeOrderId ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="font-mono text-xs text-gray-500 underline-offset-2 hover:underline"
              onClick={() => {
                setIsMapVisible((prev) => !prev);
                setLiveOrder(null);
              }}
            >
              Active order: {activeOrderId}
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsMapVisible((prev) => !prev);
                setLiveOrder(null);
              }}
            >
              {isMapVisible ? "Hide Pickup Map" : "View Active Order Map"}
            </Button>
          </div>
        ) : null}

        {activeOrderId ? (
          <div className="mt-3 space-y-2 rounded-lg border border-brand-200 bg-brand-50/60 p-3">
            <p className="font-sans text-xs text-gray-500">
              Distance to buyer:{" "}
              <span className="font-medium text-foreground">
                {distanceToBuyerMeters === null
                  ? "Unavailable"
                  : `${Math.round(distanceToBuyerMeters)} m`}
              </span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleRiderStatusUpdate("arrived_at_buyer")}
                disabled={
                  !canMarkArrivedAtBuyer || isUpdatingRiderStatus !== null
                }
                className="bg-brand-600 text-white hover:bg-brand-700"
              >
                {isUpdatingRiderStatus === "arrived"
                  ? "Updating..."
                  : "Arrived at Buyer"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRiderStatusUpdate("completed")}
                disabled={!canCompleteOrder || isUpdatingRiderStatus !== null}
                className="border-brand-300 text-brand-800 hover:bg-brand-50"
              >
                {isUpdatingRiderStatus === "complete"
                  ? "Completing..."
                  : "Complete Order"}
              </Button>
            </div>

            {!canMarkArrivedAtBuyer && canAttemptArrivalStatus ? (
              <p className="font-sans text-xs text-gray-500">
                Arrived button enables within{" "}
                {ARRIVED_AT_BUYER_THRESHOLD_METERS}m of buyer location.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeOrderId && isMapVisible ? (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-background p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-medium text-brand-900">
              Pickup Tracking Map
            </h2>
            <p className="font-sans text-xs text-gray-500">
              Seller can see this rider movement in real time.
            </p>
          </div>

          <TrackingMap {...mapState} />

          <p className="font-sans text-xs text-gray-500">
            {showPickupTarget
              ? "Target: Seller pickup location"
              : "Target: Buyer drop-off location"}
          </p>
        </div>
      ) : null}

      {activeOrderId && needsPickupVerification ? (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-background p-4">
          <div>
            <h2 className="font-heading text-xl font-medium text-brand-900">
              Pickup QR Verification
            </h2>
            <p className="font-sans text-sm text-gray-700">
              Ask seller to show QR, then scan it or manually enter the code.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              disabled={isScannerOpen}
              className="border-brand-300 text-brand-800 hover:bg-brand-50"
            >
              {isScannerOpen ? "Scanning..." : "Scan Seller QR"}
            </Button>
            {isScannerOpen ? (
              <Button
                size="sm"
                variant="outline"
                onClick={stopScanner}
                className="border-deal-300 text-deal-700 hover:bg-deal-50"
              >
                Stop Scanner
              </Button>
            ) : null}
          </div>

          {isScannerOpen ? (
            <div className="overflow-hidden rounded-lg border bg-black">
              <video
                ref={videoRef}
                className="h-56 w-full object-cover"
                muted
                playsInline
              />
            </div>
          ) : null}

          {scannerError ? (
            <p className="text-xs text-destructive">{scannerError}</p>
          ) : null}

          <input
            value={pickupCode}
            onChange={(event) => setPickupCode(event.target.value)}
            placeholder="Enter pickup code"
            className="w-full rounded-md border border-brand-200 bg-background px-3 py-2 font-sans text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100"
          />

          <Button
            onClick={handleConfirmPickup}
            disabled={isVerifyingPickup}
            className="bg-brand-600 text-white hover:bg-brand-700"
          >
            {isVerifyingPickup
              ? "Verifying..."
              : "Confirm Pickup and Start Delivery"}
          </Button>
        </div>
      ) : null}

      {incomingOrder ? (
        <div className="rounded-xl border border-deal-300 bg-deal-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-medium text-brand-900">
                Incoming Delivery Request
              </h2>
              <p className="font-mono text-xs text-gray-500">
                {incomingOrder.orderId}
              </p>
            </div>
            <p className="rounded-md bg-deal-500 px-2 py-1 text-xs font-semibold text-white">
              {secondsLeft}s
            </p>
          </div>

          <div className="mt-3 space-y-1 font-sans text-sm text-gray-700">
            <p>Distance: {incomingOrder.distanceKm.toFixed(2)} km</p>
            <p>Total Amount: PHP {incomingOrder.totalAmount.toFixed(2)}</p>
            <p>Items: {incomingOrder.items.length}</p>
            <p>
              Pickup Location:{" "}
              {incomingOrder.pickupLocation
                ? `${incomingOrder.pickupLocation.lat.toFixed(5)}, ${incomingOrder.pickupLocation.lng.toFixed(5)}`
                : "Seller location unavailable"}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => respondToOrder("accept_order")}
              disabled={isResponding || secondsLeft <= 0}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => respondToOrder("decline_order")}
              disabled={isResponding || secondsLeft <= 0}
              className="border-deal-300 text-deal-700 hover:bg-deal-50"
            >
              Decline
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 font-sans text-sm text-gray-700">
          Waiting for nearby delivery requests...
        </div>
      )}

      <Card className="border-brand-200 bg-linear-to-b from-white to-brand-50 shadow-sm">
        <CardHeader className="space-y-2 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-medium text-brand-900">
                Recent Delivery Requests
              </CardTitle>
              <p className="font-sans text-sm text-gray-700">
                Virtualized queue for rider offer history and quick scanning.
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-brand-300 bg-white text-brand-700"
            >
              {recentOffers.length} requests
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {!recentOffers.length ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-4 font-sans text-sm text-gray-600">
              No recent requests yet.
            </p>
          ) : (
            <VirtualizedSimpleBarList
              items={recentOffers}
              height={REQUEST_LIST_HEIGHT_PX}
              estimateSize={REQUEST_CARD_ESTIMATE_SIZE_PX}
              gap={REQUEST_CARD_GAP_PX}
              overscan={6}
              className="rounded-xl border border-brand-200 bg-brand-50/70"
              getItemKey={(offer) => `${offer.orderId}-${offer.receivedAt}`}
              renderItem={(offer) => (
                <div className="rounded-xl border border-brand-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-500">
                        {offer.orderId}
                      </p>
                      <p className="mt-1 font-heading text-base font-medium text-brand-900">
                        PHP {offer.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-deal-300 bg-deal-100 text-deal-700"
                    >
                      {offer.distanceKm.toFixed(2)} km
                    </Badge>
                  </div>

                  <div className="mt-2 grid gap-1 font-sans text-xs text-gray-500 sm:grid-cols-2">
                    <p>Items: {offer.items.length}</p>
                    <p>
                      Received:{" "}
                      {new Date(offer.receivedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
