import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthUser, POSUsage } from "@/types/auth";

interface AuthState {
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  posUsage: POSUsage | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setAuth: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
    sessionId?: string | null,
    posUsage?: POSUsage | null,
  ) => void;
  setPOSUsage: (usage: POSUsage | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      posUsage: null,
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setAuth: (accessToken, refreshToken, user, sessionId = null, posUsage = null) =>
        set({
          token: accessToken,
          accessToken,
          refreshToken,
          sessionId,
          posUsage,
          user,
          isAuthenticated: true,
        }),
      setPOSUsage: (posUsage) => set({ posUsage }),
      clearAuth: () =>
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          posUsage: null,
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
        sessionId: state.sessionId,
        posUsage: state.posUsage,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
