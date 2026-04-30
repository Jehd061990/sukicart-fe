import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.request.use((config) => {
  const token =
    useAuthStore.getState().accessToken || useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (isAuthRoute || originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          throw new Error("Missing refresh token");
        }

        const { data } = await refreshClient.post("/auth/refresh", {
          refreshToken,
        });

        useAuthStore
          .getState()
          .setAuth(
            data.accessToken,
            data.refreshToken,
            data.user,
            data.sessionId,
            data.posUsage || null,
          );
      })().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      const nextToken = useAuthStore.getState().accessToken;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    }
  },
);
