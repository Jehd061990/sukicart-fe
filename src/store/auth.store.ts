import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setAuth: (accessToken, refreshToken, user) =>
        set({
          token: accessToken,
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "sukicart-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
