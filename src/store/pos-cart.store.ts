import { create } from "zustand";
import { Product } from "@/types/product";

export interface POSCartItem {
  productId: string;
  name: string;
  unit: "kg" | "pcs";
  price: number;
  quantity: number;
  maxStock: number;
}

interface POSCartState {
  items: POSCartItem[];
  addItem: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const usePOSCartStore = create<POSCartState>((set, get) => ({
  items: [],

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find(
        (item) => item.productId === product._id,
      );

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, existing.maxStock);
        return {
          items: state.items.map((item) =>
            item.productId === product._id
              ? { ...item, quantity: nextQuantity }
              : item,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            productId: product._id,
            name: product.name,
            unit: product.unit,
            price: product.price,
            quantity: 1,
            maxStock: product.stock,
          },
        ],
      };
    });
  },

  setQuantity: (productId, quantity) => {
    set((state) => {
      const item = state.items.find((x) => x.productId === productId);
      if (!item) {
        return state;
      }

      if (quantity <= 0) {
        return {
          items: state.items.filter((x) => x.productId !== productId),
        };
      }

      const nextQuantity = Math.min(quantity, item.maxStock);
      return {
        items: state.items.map((x) =>
          x.productId === productId ? { ...x, quantity: nextQuantity } : x,
        ),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const items = get().items;
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return Number(total.toFixed(2));
  },
}));
