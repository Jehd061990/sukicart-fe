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
