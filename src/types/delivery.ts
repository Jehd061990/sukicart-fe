export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "assigned_to_rider"
  | "arrived_at_seller"
  | "picked_up"
  | "out_for_delivery"
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
