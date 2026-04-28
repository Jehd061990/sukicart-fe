"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orderService } from "@/lib/api/services/order.service";
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
    return error.response?.data?.message || "Failed to place your order";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to place your order";
};

export default function BuyerCheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clearCart);

  const [buyerLat, setBuyerLat] = useState("");
  const [buyerLng, setBuyerLng] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");

  const orderItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    [items],
  );

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
          toast.error(
            "Location permission denied. You can still enter coordinates manually.",
          );
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

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) {
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
      setIsSubmitting(true);

      const response = await orderService.createOrder({
        items: orderItems,
        buyerLocation:
          parsedLat !== null && parsedLng !== null
            ? { lat: parsedLat, lng: parsedLng }
            : null,
      });

      const nextOrderId = String(response.order._id);
      setCreatedOrderId(nextOrderId);
      clearCart();
      if ((response.orders?.length || 0) > 1) {
        toast.success(
          `Checkout placed ${response.orders?.length || 0} seller orders successfully`,
        );
      } else {
        toast.success("Order placed successfully");
      }
    } catch (error) {
      toast.error(parseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card className="border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
            Buyer Checkout (COD)
          </CardTitle>
          <p className="font-sans text-sm text-gray-700">
            Place your order now and it will appear on seller order management.
          </p>
        </CardHeader>
      </Card>

      {createdOrderId ? (
        <Card className="border-brand-200">
          <CardContent className="space-y-3 py-5">
            <p className="font-sans text-sm text-gray-700">
              Order placed with ID
            </p>
            <p className="font-mono text-sm font-semibold">{createdOrderId}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push("/buyer/tracking")}>
                Go to Tracking
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/buyer/products")}
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-brand-200">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium text-brand-900">
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="font-sans text-sm text-gray-700">
              Your cart is currently empty.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2"
                >
                  <div>
                    <p className="font-heading text-base font-medium text-brand-900">
                      {item.name}
                    </p>
                    <p className="font-sans text-xs text-gray-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    PHP {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-brand-200 pt-3">
            <span className="font-sans text-sm text-gray-700">Subtotal</span>
            <span className="font-heading text-lg font-semibold text-brand-900">
              PHP {subtotal.toFixed(2)}
            </span>
          </div>
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

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/buyer/cart")}
              className="border-brand-300 text-brand-800 hover:bg-brand-50"
            >
              Back to Cart
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || items.length === 0}
              className="bg-brand-600 text-white hover:bg-brand-700"
            >
              {isSubmitting ? "Placing Order..." : "Place COD Order"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
