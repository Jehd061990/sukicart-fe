export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "out_for_delivery"
  | "delivered";

export interface GeoLocation {
  lat: number;
  lng: number;
  updatedAt?: string | Date | null;
}

export interface DeliveryTrackingOrder {
  _id: string;
  riderId?: string | null;
  currentLocation?: GeoLocation | null;
  status: OrderStatus;
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
