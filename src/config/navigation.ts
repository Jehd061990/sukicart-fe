import {
  LucideIcon,
  ClipboardCheck,
  House,
  HandCoins,
  LayoutGrid,
  LocateFixed,
  Package,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { UserRole } from "@/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type RoleModuleConfig = {
  title: string;
  role: Exclude<UserRole, "ADMIN">;
  routeBase: string;
  modules: NavItem[];
};

export const ROLE_MODULES: RoleModuleConfig[] = [
  {
    title: "Buyer Modules",
    role: "BUYER",
    routeBase: "/buyer",
    modules: [
      { label: "Home", href: "/buyer/home", icon: House },
      { label: "Product List", href: "/buyer/products", icon: Package },
      { label: "Cart", href: "/buyer/cart", icon: ShoppingBasket },
      { label: "Checkout (COD)", href: "/buyer/checkout", icon: Receipt },
      { label: "Order Tracking", href: "/buyer/tracking", icon: Truck },
    ],
  },
  {
    title: "Seller Modules",
    role: "SELLER",
    routeBase: "/seller",
    modules: [
      { label: "Dashboard", href: "/seller/dashboard", icon: LayoutGrid },
      {
        label: "Product Management",
        href: "/seller/products",
        icon: Package,
      },
      { label: "POS", href: "/seller/pos", icon: HandCoins },
      { label: "Order Management", href: "/seller/orders", icon: ShoppingCart },
      {
        label: "Inventory Sync",
        href: "/seller/inventory",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "Rider Modules",
    role: "RIDER",
    routeBase: "/rider",
    modules: [
      {
        label: "Accept Order",
        href: "/rider/accept-order",
        icon: ShoppingCart,
      },
      {
        label: "Update Status",
        href: "/rider/update-status",
        icon: ClipboardCheck,
      },
      {
        label: "Send Location",
        href: "/rider/send-location",
        icon: LocateFixed,
      },
      { label: "Mark Delivered", href: "/rider/mark-delivered", icon: Truck },
    ],
  },
];

const navByRole: Record<Exclude<UserRole, "ADMIN">, NavItem[]> = {
  BUYER: ROLE_MODULES.find((config) => config.role === "BUYER")?.modules || [],
  SELLER:
    ROLE_MODULES.find((config) => config.role === "SELLER")?.modules || [],
  RIDER: ROLE_MODULES.find((config) => config.role === "RIDER")?.modules || [],
};

export const getNavItemsByRole = (role?: UserRole | null): NavItem[] => {
  if (!role || role === "ADMIN") {
    return [];
  }

  return navByRole[role] || [];
};
