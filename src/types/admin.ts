export type SellerReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

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

export interface AdminDashboardStats {
  totalUsers: number;
  totalSellers: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface AdminSeller {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  storeName: string;
  storeType: string;
  status: SellerReviewStatus;
  isActive: boolean;
  phoneNumber: string;
  marketLocation: string;
  exactAddress: string;
  createdAt: string;
}

export interface AdminRider {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminBuyer {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phoneNumber: string;
  city: string;
  barangay: string;
  streetAddress: string;
  isActive: boolean;
}

export interface AdminOrder {
  id: string;
  buyerName: string;
  sellerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export interface CreateRiderPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  isActive?: boolean;
}

export interface AdminRiderAssignmentCandidate {
  index: number;
  riderId: string;
  riderName: string;
  distanceKm: number;
}

export interface AdminRiderAssignment {
  orderId: string;
  fallbackStatus: string;
  currentIndex: number;
  currentRiderId: string | null;
  remainingOfferMs: number | null;
  candidateCount: number;
  candidates: AdminRiderAssignmentCandidate[];
}
