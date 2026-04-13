import {
  DeliveryTrackingOrder,
  GeoLocation,
  OrderStatus,
} from "@/types/delivery";

export const FALLBACK_LOCATION: GeoLocation = {
  lat: 14.5995,
  lng: 120.9842,
  updatedAt: null,
};

const BUYER_TARGET_STATUSES: OrderStatus[] = [
  "picked_up",
  "out_for_delivery",
  "delivered",
];

export const isBuyerTargetStatus = (status: OrderStatus) =>
  BUYER_TARGET_STATUSES.includes(status);

export const getTargetLocation = (
  order: DeliveryTrackingOrder | null,
): GeoLocation | null => {
  if (!order) {
    return null;
  }

  if (order.targetLocation?.lat && order.targetLocation?.lng) {
    return order.targetLocation;
  }

  if (isBuyerTargetStatus(order.status)) {
    return order.buyerLocation || null;
  }

  return order.sellerLocation || null;
};

export const hasCoords = (location?: GeoLocation | null) =>
  Boolean(
    location && Number.isFinite(location.lat) && Number.isFinite(location.lng),
  );

export const buildGoogleMapsDirectionUrl = (location?: GeoLocation | null) => {
  if (!hasCoords(location)) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${location!.lat},${location!.lng}`;
};
