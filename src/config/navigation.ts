import {
  LucideIcon,
  HandCoins,
  LayoutGrid,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "POS", href: "/pos", icon: HandCoins },
  { label: "Products", href: "/products", icon: Package },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Deliveries", href: "/deliveries", icon: Truck },
  { label: "Users", href: "/users", icon: Users },
];
