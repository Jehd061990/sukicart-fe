import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SellerPlanTier } from "@/types/saas-dashboard";

interface SellerDashboardState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  personalizedWidgetOrder: string[];
  hiddenWidgetIds: string[];
  selectedBranch: string;
  darkModeEnabled: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setWidgetOrder: (widgetIds: string[]) => void;
  moveWidget: (draggedId: string, droppedOnId: string) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  setSelectedBranch: (branch: string) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  hydratePlanDefaults: (plan: SellerPlanTier, widgetIds: string[]) => void;
}

const safeReorder = (ids: string[], fromId: string, toId: string) => {
  if (!ids.includes(fromId) || !ids.includes(toId)) {
    return ids;
  }

  const next = [...ids];
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const useSellerDashboardStore = create<SellerDashboardState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      personalizedWidgetOrder: [],
      hiddenWidgetIds: [],
      selectedBranch: "All Branches",
      darkModeEnabled: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setWidgetOrder: (widgetIds) => set({ personalizedWidgetOrder: widgetIds }),
      moveWidget: (draggedId, droppedOnId) =>
        set((state) => ({
          personalizedWidgetOrder: safeReorder(
            state.personalizedWidgetOrder,
            draggedId,
            droppedOnId,
          ),
        })),
      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          hiddenWidgetIds: state.hiddenWidgetIds.includes(widgetId)
            ? state.hiddenWidgetIds.filter((id) => id !== widgetId)
            : [...state.hiddenWidgetIds, widgetId],
        })),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),
      hydratePlanDefaults: (_plan, widgetIds) => {
        const state = get();
        const existing = state.personalizedWidgetOrder;
        if (existing.length === 0) {
          set({ personalizedWidgetOrder: widgetIds });
          return;
        }

        const validExisting = existing.filter((id) => widgetIds.includes(id));
        const missing = widgetIds.filter((id) => !validExisting.includes(id));
        set({ personalizedWidgetOrder: [...validExisting, ...missing] });
      },
    }),
    {
      name: "sukigo-seller-dashboard",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        personalizedWidgetOrder: state.personalizedWidgetOrder,
        hiddenWidgetIds: state.hiddenWidgetIds,
        selectedBranch: state.selectedBranch,
        darkModeEnabled: state.darkModeEnabled,
      }),
    },
  ),
);
