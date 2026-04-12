export type UserRole = "ADMIN" | "SELLER" | "BUYER" | "RIDER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: "active" | "inactive" | "pending";
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  token?: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "ADMIN">;
}
