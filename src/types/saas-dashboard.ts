import { LucideIcon } from "lucide-react";
import { SubscriptionPlanCode } from "@/types/payment";

export type SellerPlanTier = SubscriptionPlanCode;

export type SellerFeatureKey =
  | "dashboard"
  | "basicPOS"
  | "cashAndGcash"
  | "barcodeScan"
  | "products"
  | "orders"
  | "customers"
  | "settings"
  | "employees"
  | "inventory"
  | "reports"
  | "notifications"
  | "billing"
  | "advancedAnalytics"
  | "multiBranch"
  | "transfers"
  | "automation"
  | "auditLogs"
  | "forecasting"
  | "supplierAnalytics"
  | "branchComparison";

export type SellerFeatureFlags = Record<SellerFeatureKey, boolean>;

export interface SellerDashboardModule {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  requiredFeature: SellerFeatureKey;
  upgradeMessage?: string;
}

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  metric: string;
  delta: string;
  tone: "success" | "warning" | "neutral";
  featureKey: SellerFeatureKey;
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  timestamp: string;
}

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  featureKey: SellerFeatureKey;
}
