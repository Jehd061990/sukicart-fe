export type UserRole = "ADMIN" | "SELLER" | "POS" | "BUYER" | "RIDER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  sellerId?: string | null;
  role: UserRole;
  status?: "active" | "inactive" | "pending";
}

export interface POSUsage {
  active: number;
  total: number;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  token?: string;
  user: AuthUser;
  sessionId?: string | null;
  posUsage?: POSUsage;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  deviceId: string;
  deviceName?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "ADMIN">;
}
