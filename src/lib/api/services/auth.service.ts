import { apiClient } from "@/lib/api/client";
import { AuthResponse, LoginPayload, RegisterPayload } from "@/types/auth";

export const authService = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<AuthResponse>(
      "/auth/register",
      payload,
    );
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get<{ user: AuthResponse["user"] }>(
      "/auth/me",
    );
    return data;
  },
};
