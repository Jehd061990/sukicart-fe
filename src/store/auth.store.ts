import { create } from "zustand";
import { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: (token, user) =>
    set({
      token,
      user,
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    }),
}));
