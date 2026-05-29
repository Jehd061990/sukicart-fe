export interface SellerDashboardSummary {
  todaySales: number;
  yesterdaySales: number;
  todaySalesChangePct: number | null;
  totalOrders: number;
  recentTransactions: number;
  productCount: number;
  recentlyUpdatedProducts: number;
  lowStockCount: number;
  criticalLowStockCount: number;
  monthlyRevenue: number;
  previousMonthlyRevenue: number;
  monthlyRevenueChangePct: number | null;
}

export interface SellerDashboardDailyPoint {
  label: string;
  sales: number;
  orders: number;
}

export interface SellerDashboardWeeklyPoint {
  label: string;
  sales: number;
  orders: number;
}

export interface SellerDashboardChannelPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface SellerDashboardSummaryResponse {
  summary: SellerDashboardSummary;
  charts: {
    daily: SellerDashboardDailyPoint[];
    weekly: SellerDashboardWeeklyPoint[];
    channels: SellerDashboardChannelPoint[];
  };
}

export type SellerDashboardIncomePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "custom";

export interface SellerDashboardIncomeBranchRow {
  branchId: string | null;
  branchName: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  transactions: number;
  orders: number;
  previousNetSales: number;
  trendPct: number | null;
}

export interface SellerDashboardIncomeTerminalRow {
  terminalId: string | null;
  terminalLabel: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  transactions: number;
  orders: number;
}

export interface SellerDashboardIncomeResponse {
  range: {
    preset: SellerDashboardIncomePreset;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  overall: {
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    transactions: number;
    orders: number;
  };
  branches: {
    rows: SellerDashboardIncomeBranchRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  selectedBranch: {
    branchId: string;
    branchName: string;
    terminals: SellerDashboardIncomeTerminalRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  } | null;
}
