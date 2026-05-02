import { create } from "zustand";

interface PWAState {
  online: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setPendingSyncCount: (pendingSyncCount: number) => void;
}

export const usePWAStore = create<PWAState>((set) => ({
  online: true,
  isSyncing: false,
  pendingSyncCount: 0,
  setOnline: (online) => set({ online }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
}));
