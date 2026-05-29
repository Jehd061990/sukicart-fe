import {
  Building2,
  Bluetooth,
  ChartColumnIncreasing,
  ShieldCheck,
  DollarSign,
  LucideIcon,
  ClipboardCheck,
  FileClock,
  House,
  HandCoins,
  LayoutGrid,
  LocateFixed,
  Package,
  Repeat2,
  Receipt,
  Sparkles,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { UserRole } from "@/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type RoleModuleConfig = {
  title: string;
  role: UserRole;
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
      { label: "Checkout", href: "/buyer/checkout", icon: Receipt },
      { label: "Order Tracking", href: "/buyer/tracking", icon: Truck },
    ],
  },
  {
    title: "Seller Modules",
    role: "SELLER",
    routeBase: "/seller",
    modules: [
      { label: "Dashboard", href: "/seller/dashboard", icon: LayoutGrid },
      { label: "Multi-Branch", href: "/seller/branches", icon: Building2 },
      { label: "POS", href: "/seller/pos", icon: HandCoins },
      { label: "Billing", href: "/seller/billing", icon: DollarSign },
      {
        label: "Products",
        href: "/seller/products",
        icon: Package,
      },
      { label: "Customers", href: "/seller/customers", icon: Users },
      { label: "Employees", href: "/seller/employees", icon: ShieldCheck },
      {
        label: "Inventory",
        href: "/seller/inventory",
        icon: Warehouse,
      },
      { label: "Transfers", href: "/seller/transfers", icon: Repeat2 },
      {
        label: "Analytics",
        href: "/seller/analytics",
        icon: ChartColumnIncreasing,
      },
      { label: "Reports", href: "/seller/reports", icon: ClipboardCheck },
      { label: "Automation", href: "/seller/automation", icon: Sparkles },
      { label: "Audit Logs", href: "/seller/audit-logs", icon: FileClock },
      {
        label: "Settings",
        href: "/seller/store-config",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Admin Modules",
    role: "ADMIN",
    routeBase: "/admin",
    modules: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
      {
        label: "Seller Management",
        href: "/admin/dashboard#sellers",
        icon: ClipboardCheck,
      },
      {
        label: "Rider Management",
        href: "/admin/dashboard#riders",
        icon: Truck,
      },
      {
        label: "Buyer Management",
        href: "/admin/dashboard#buyers",
        icon: ShieldCheck,
      },
      {
        label: "Order Management",
        href: "/admin/dashboard#orders",
        icon: ShoppingCart,
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
  {
    title: "POS Modules",
    role: "POS",
    routeBase: "/pos",
    modules: [
      {
        label: "Sales Dashboard",
        href: "/pos?panel=dashboard",
        icon: ChartColumnIncreasing,
      },
      { label: "Store Operations", href: "/pos", icon: HandCoins },
      // { label: "Online Orders", href: "/pos?panel=orders", icon: ShoppingCart },  {/* This will be a future feature if there are many users of POS */}
      { label: "Receipt History", href: "/pos?panel=receipts", icon: Receipt },
      { label: "Printer Module", href: "/pos/printer", icon: Bluetooth },
    ],
  },
];

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: ROLE_MODULES.find((config) => config.role === "ADMIN")?.modules || [],
  BUYER: ROLE_MODULES.find((config) => config.role === "BUYER")?.modules || [],
  SELLER:
    ROLE_MODULES.find((config) => config.role === "SELLER")?.modules || [],
  POS: ROLE_MODULES.find((config) => config.role === "POS")?.modules || [],
  RIDER: ROLE_MODULES.find((config) => config.role === "RIDER")?.modules || [],
};

export const getNavItemsByRole = (role?: UserRole | null): NavItem[] => {
  if (!role) {
    return [];
  }

  return navByRole[role] || [];
};
