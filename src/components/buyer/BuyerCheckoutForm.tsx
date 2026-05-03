"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePayment } from "@/hooks/usePayment";
import { useCartStore } from "@/store/cart.store";

const toNumberOrNull = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || "Failed to initialize checkout";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to initialize checkout";
};

export function BuyerCheckoutForm() {
  const searchParams = useSearchParams();
  const paymentIdFromUrl = searchParams.get("paymentId") || undefined;

  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clearCart);

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya" | "bank">("gcash");
  const [buyerLat, setBuyerLat] = useState("");
  const [buyerLng, setBuyerLng] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { createCheckoutMutation, paymentStatusQuery } = usePayment(paymentIdFromUrl);

  const paymentStatus = paymentStatusQuery.data?.payment?.status || "";

  useEffect(() => {
    if (paymentStatus !== "paid") {
      return;
    }

    clearCart();
  }, [clearCart, paymentStatus]);

  const orderItems = useMemo(
    () =>
      (isHydrated ? items : []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    [isHydrated, items],
  );

  const displayItems = isHydrated ? items : [];
  const displaySubtotal = isHydrated ? subtotal : 0;

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLat(String(position.coords.latitude));
        setBuyerLng(String(position.coords.longitude));
        setLocationDetected(true);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setLocationDetected(false);

        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission denied. You can still enter coordinates manually.");
          return;
        }

        toast.error("Unable to get current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const onCheckout = async () => {
    if (!orderItems.length) {
      toast.error("Your cart is empty");
      return;
    }

    const parsedLat = toNumberOrNull(buyerLat);
    const parsedLng = toNumberOrNull(buyerLng);
    if ((parsedLat === null) !== (parsedLng === null)) {
      toast.error("Provide both latitude and longitude, or leave both blank");
      return;
    }

    try {
      const response = await createCheckoutMutation.mutateAsync({
        items: orderItems,
        paymentMethod,
        buyerLocation:
          parsedLat !== null && parsedLng !== null
            ? {
                lat: parsedLat,
                lng: parsedLng,
              }
            : null,
      });

      window.location.href = response.payment.checkoutUrl;
    } catch (error) {
      toast.error(parseErrorMessage(error));
    }
  };

  return (
    <section className="space-y-4">
      <Card className="border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
            Buyer Checkout
          </CardTitle>
          <p className="font-sans text-sm text-gray-700">
            Pay using Xendit hosted checkout. Final payment confirmation comes from webhook verification.
          </p>
        </CardHeader>
      </Card>

      {paymentIdFromUrl ? (
        <Card className="border-brand-200">
          <CardContent className="space-y-2 py-5">
            <p className="font-sans text-sm text-gray-700">Payment ID</p>
            <p className="font-mono text-sm font-semibold text-brand-900">{paymentIdFromUrl}</p>
            <p className="text-sm text-gray-700">
              Status: <span className="font-semibold uppercase">{paymentStatus || "pending"}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-brand-200">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium text-brand-900">
            Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayItems.length === 0 ? (
            <p className="font-sans text-sm text-gray-700">Your cart is currently empty.</p>
          ) : (
            <div className="space-y-2">
              {displayItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2"
                >
                  <div>
                    <p className="font-heading text-base font-medium text-brand-900">{item.name}</p>
                    <p className="font-sans text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">PHP {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-brand-200 pt-3">
            <span className="font-sans text-sm text-gray-700">Total</span>
            <span className="font-heading text-lg font-semibold text-brand-900">PHP {displaySubtotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-brand-200">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium text-brand-900">
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "gcash"}
              onChange={() => setPaymentMethod("gcash")}
            />
            GCash
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "maya"}
              onChange={() => setPaymentMethod("maya")}
            />
            Maya
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "bank"}
              onChange={() => setPaymentMethod("bank")}
            />
            Bank Transfer
          </label>
        </CardContent>
      </Card>

      <Card className="border-brand-200">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium text-brand-900">
            Buyer Location (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCurrentLocation}
              disabled={isLocating}
              className="border-brand-300 text-brand-800 hover:bg-brand-50"
            >
              {isLocating ? "Detecting location..." : "Use Current Location"}
            </Button>
            {locationDetected ? (
              <span className="rounded-full bg-brand-100 px-2.5 py-1 font-sans text-xs font-medium text-brand-700">
                Current location added to payload
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={buyerLat}
              onChange={(event) => setBuyerLat(event.target.value)}
              placeholder="Latitude (e.g. 7.0731)"
            />
            <Input
              value={buyerLng}
              onChange={(event) => setBuyerLng(event.target.value)}
              placeholder="Longitude (e.g. 125.6128)"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={onCheckout}
              disabled={createCheckoutMutation.isPending || !isHydrated || displayItems.length === 0}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              {createCheckoutMutation.isPending ? "Redirecting..." : "Proceed to Payment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
