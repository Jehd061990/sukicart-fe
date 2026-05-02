import { create } from "zustand";

interface ScannerStoreState {
  cooldownMs: number;
  lastScannedValue: string;
  lastScannedAt: number;
  comboCount: number;
  lastComboAt: number;
  canProcessScan: (value: string, now?: number) => boolean;
  registerSuccess: (value: string, now?: number) => number;
  registerFailure: () => void;
  resetCombo: () => void;
}

export const useScannerStore = create<ScannerStoreState>((set, get) => ({
  cooldownMs: 1400,
  lastScannedValue: "",
  lastScannedAt: 0,
  comboCount: 0,
  lastComboAt: 0,

  canProcessScan: (value, now = Date.now()) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return false;
    }

    const { cooldownMs, lastScannedAt, lastScannedValue } = get();
    const withinCooldown = now - lastScannedAt < cooldownMs;
    const isDuplicate = lastScannedValue === normalized;

    return !(withinCooldown && isDuplicate);
  },

  registerSuccess: (value, now = Date.now()) => {
    const normalized = String(value || "").trim();
    const { comboCount, lastComboAt } = get();
    const withinWindow = now - lastComboAt <= 3000;
    const nextCombo = withinWindow ? comboCount + 1 : 1;

    set({
      lastScannedValue: normalized,
      lastScannedAt: now,
      comboCount: nextCombo,
      lastComboAt: now,
    });

    return nextCombo;
  },

  registerFailure: () => {
    set({ comboCount: 0, lastComboAt: 0 });
  },

  resetCombo: () => {
    set({ comboCount: 0, lastComboAt: 0 });
  },
}));
