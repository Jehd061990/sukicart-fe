import { create } from "zustand";
import { Product } from "@/types/product";

export interface POSCartItem {
  lineKey: string;
  productId: string;
  name: string;
  unit: "kg" | "pcs";
  price: number;
  quantity: number;
  maxStock: number;
  variant: string;
  note: string;
}

interface POSCartState {
  items: POSCartItem[];
  hydrateItems: (items: POSCartItem[]) => void;
  addItem: (product: Product) => void;
  addConfiguredItem: (
    product: Product,
    options?: { quantity?: number; variant?: string; note?: string },
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

const normalizeText = (value: unknown) => String(value || "").trim();

const buildLineKey = (productId: string, variant: string, note: string) =>
  `${productId}::${variant.toLowerCase()}::${note.toLowerCase()}`;

const getProductQuantityInCart = (items: POSCartItem[], productId: string) =>
  items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);

export const usePOSCartStore = create<POSCartState>((set, get) => ({
  items: [],

  hydrateItems: (items) => {
    const normalized = (items || []).map((item) => {
      const variant = normalizeText(item.variant) || "Regular";
      const note = normalizeText(item.note);
      const lineKey =
        normalizeText(item.lineKey) ||
        buildLineKey(item.productId, variant, note);

      return {
        ...item,
        lineKey,
        variant,
        note,
      };
    });

    set({ items: normalized });
  },

  addItem: (product) => {
    get().addConfiguredItem(product, { quantity: 1, variant: "Regular", note: "" });
  },

  addConfiguredItem: (product, options) => {
    const variant = normalizeText(options?.variant) || "Regular";
    const note = normalizeText(options?.note);
    const requestedQuantity = Math.max(1, Number(options?.quantity || 1));
    const lineKey = buildLineKey(product._id, variant, note);

    set((state) => {
      const currentProductQty = getProductQuantityInCart(state.items, product._id);
      const availableQty = Math.max(0, product.stock - currentProductQty);
      const safeQuantity = Math.min(requestedQuantity, availableQty);

      if (safeQuantity <= 0) {
        return state;
      }

      const existing = state.items.find((item) => item.lineKey === lineKey);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.lineKey === lineKey
              ? { ...item, quantity: item.quantity + safeQuantity }
              : item,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            lineKey,
            productId: product._id,
            name: product.name,
            unit: product.unit,
            price: product.price,
            quantity: safeQuantity,
            maxStock: product.stock,
            variant,
            note,
          },
        ],
      };
    });
  },

  setQuantity: (lineKey, quantity) => {
    set((state) => {
      const item = state.items.find((x) => x.lineKey === lineKey);
      if (!item) {
        return state;
      }

      if (quantity <= 0) {
        return {
          items: state.items.filter((x) => x.lineKey !== lineKey),
        };
      }

      const otherProductQty = state.items
        .filter(
          (x) => x.productId === item.productId && x.lineKey !== lineKey,
        )
        .reduce((sum, x) => sum + x.quantity, 0);

      const nextQuantity = Math.min(quantity, Math.max(0, item.maxStock - otherProductQty));
      return {
        items: state.items.map((x) =>
          x.lineKey === lineKey ? { ...x, quantity: nextQuantity } : x,
        ),
      };
    });
  },

  removeItem: (lineKey) => {
    set((state) => ({
      items: state.items.filter((item) => item.lineKey !== lineKey),
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
