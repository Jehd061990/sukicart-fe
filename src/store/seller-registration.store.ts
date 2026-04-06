import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SellerRegistrationDraft,
  sellerRegistrationDraftDefaults,
} from "@/types/seller-registration";

interface SellerRegistrationStore {
  draft: SellerRegistrationDraft;
  setDraft: (partial: Partial<SellerRegistrationDraft>) => void;
  clearDraft: () => void;
}

export const useSellerRegistrationStore = create<SellerRegistrationStore>()(
  persist(
    (set) => ({
      draft: sellerRegistrationDraftDefaults,
      setDraft: (partial) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...partial,
          },
        })),
      clearDraft: () => set({ draft: sellerRegistrationDraftDefaults }),
    }),
    {
      name: "seller-registration-draft",
    },
  ),
);
