export type OrderStatus =
  | "pending"
  | "searching_rider"
  | "accepted"
  | "delivering"
  | "completed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned_to_rider"
  | "arrived_at_seller"
  | "picked_up"
  | "out_for_delivery"
  | "arrived_at_buyer"
  | "delivered";

export interface GeoLocation {
  lat: number;
  lng: number;
  updatedAt?: string | Date | null;
}

export interface DeliveryTrackingOrder {
  orderId: string;
  riderId?: string | null;
  riderLocation?: GeoLocation | null;
  sellerLocation?: GeoLocation | null;
  buyerLocation?: GeoLocation | null;
  targetLocation?: GeoLocation | null;
  targetType?: "seller" | "buyer";
  status: OrderStatus;
  updatedAt?: string;
}

export interface RiderAssignedEvent {
  orderId: string;
  riderId: string;
}

export interface LocationUpdatedEvent {
  orderId: string;
  riderId: string;
  location: GeoLocation;
}

export type TrackingUpdatedEvent = DeliveryTrackingOrder;

export interface NewOrderRequestEvent {
  orderId: string;
  buyerId: string | null;
  sellerId: string | null;
  items: Array<{
    productId: string;
    name: string;
    unit: "kg" | "pcs";
    quantity: number;
    price: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  pickupLocation: GeoLocation | null;
  sellerLocation: GeoLocation | null;
  deliveryAddress: GeoLocation | null;
  distanceKm: number;
  expiresInSec: number;
}

export interface OrderStatusUpdateEvent {
  orderId: string;
  status: OrderStatus;
  riderId?: string | null;
  riderName?: string;
  message?: string;
}
