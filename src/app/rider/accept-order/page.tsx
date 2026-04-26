"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { FALLBACK_LOCATION, hasCoords } from "@/lib/delivery/tracking";

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
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
];

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

  const onNewOrderRequest = useCallback((payload: NewOrderRequestEvent) => {
    setIncomingOrder(payload);
    setSecondsLeft(payload.expiresInSec || 10);
    setIsResponding(false);
    setLatestStatus("incoming order");
  }, []);

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
  });

  useDeliverySocket({
    orderId: activeOrderId,
    onTrackingUpdated: (payload) => setLiveOrder(payload),
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

  const trackedOrder = liveOrder || trackingQuery.data?.order || null;
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
      riderLocation: trackedOrder?.riderLocation || FALLBACK_LOCATION,
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
    <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">Rider Auto Assignment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Receive nearby order requests in real time and accept or decline.
        </p>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Current State
        </p>
        <p className="mt-1 text-lg font-semibold">{riderState}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest status: {toStatusLabel(latestStatus)}
        </p>
        {activeOrderId ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-xs font-mono text-muted-foreground underline-offset-2 hover:underline"
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
          <div className="mt-3 space-y-2 rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">
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
              >
                {isUpdatingRiderStatus === "complete"
                  ? "Completing..."
                  : "Complete Order"}
              </Button>
            </div>

            {!canMarkArrivedAtBuyer && canAttemptArrivalStatus ? (
              <p className="text-xs text-muted-foreground">
                Arrived button enables within{" "}
                {ARRIVED_AT_BUYER_THRESHOLD_METERS}m of buyer location.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeOrderId && isMapVisible ? (
        <div className="space-y-3 rounded-xl border bg-background p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pickup Tracking Map</h2>
            <p className="text-xs text-muted-foreground">
              Seller can see this rider movement in real time.
            </p>
          </div>

          <TrackingMap {...mapState} />

          <p className="text-xs text-muted-foreground">
            {showPickupTarget
              ? "Target: Seller pickup location"
              : "Target: Buyer drop-off location"}
          </p>
        </div>
      ) : null}

      {activeOrderId && needsPickupVerification ? (
        <div className="space-y-3 rounded-xl border bg-background p-4">
          <div>
            <h2 className="text-sm font-semibold">Pickup QR Verification</h2>
            <p className="text-xs text-muted-foreground">
              Ask seller to show QR, then scan it or manually enter the code.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              disabled={isScannerOpen}
            >
              {isScannerOpen ? "Scanning..." : "Scan Seller QR"}
            </Button>
            {isScannerOpen ? (
              <Button size="sm" variant="outline" onClick={stopScanner}>
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />

          <Button onClick={handleConfirmPickup} disabled={isVerifyingPickup}>
            {isVerifyingPickup
              ? "Verifying..."
              : "Confirm Pickup and Start Delivery"}
          </Button>
        </div>
      ) : null}

      {incomingOrder ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Incoming Delivery Request
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {incomingOrder.orderId}
              </p>
            </div>
            <p className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              {secondsLeft}s
            </p>
          </div>

          <div className="mt-3 space-y-1 text-sm">
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
            >
              Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => respondToOrder("decline_order")}
              disabled={isResponding || secondsLeft <= 0}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Waiting for nearby delivery requests...
        </div>
      )}
    </section>
  );
}
