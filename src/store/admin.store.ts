import { create } from "zustand";
import { adminService } from "@/lib/api/services/admin.service";
import {
  AdminBuyer,
  AdminDashboardStats,
  AdminOrder,
  AdminRider,
  AdminSeller,
  CreateRiderPayload,
  OrderStatus,
  SellerReviewStatus,
} from "@/types/admin";

type LoadingState = {
  stats: boolean;
  sellers: boolean;
  riders: boolean;
  buyers: boolean;
  orders: boolean;
  action: boolean;
};

interface AdminState {
  stats: AdminDashboardStats;
  sellers: AdminSeller[];
  riders: AdminRider[];
  buyers: AdminBuyer[];
  orders: AdminOrder[];
  loading: LoadingState;
  fetchDashboardData: (orderStatus?: "all" | OrderStatus) => Promise<void>;
  updateSellerStatus: (
    sellerProfileId: string,
    status: SellerReviewStatus,
  ) => Promise<void>;
  addRider: (payload: CreateRiderPayload) => Promise<void>;
  toggleRiderStatus: (userId: string) => Promise<void>;
  removeRider: (userId: string) => Promise<void>;
  disableBuyer: (userId: string) => Promise<void>;
  fetchOrders: (orderStatus?: "all" | OrderStatus) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const defaultStats: AdminDashboardStats = {
  totalUsers: 0,
  totalSellers: 0,
  totalOrders: 0,
  totalRevenue: 0,
};

const defaultLoading: LoadingState = {
  stats: false,
  sellers: false,
  riders: false,
  buyers: false,
  orders: false,
  action: false,
};

export const useAdminStore = create<AdminState>((set) => ({
  stats: defaultStats,
  sellers: [],
  riders: [],
  buyers: [],
  orders: [],
  loading: defaultLoading,

  fetchDashboardData: async (orderStatus = "all") => {
    set((state) => ({
      loading: {
        ...state.loading,
        stats: true,
        sellers: true,
        riders: true,
        buyers: true,
        orders: true,
      },
    }));

    try {
      const [stats, sellers, riders, buyers, orders] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSellers(),
        adminService.getRiders(),
        adminService.getBuyers(),
        adminService.getOrders(orderStatus),
      ]);

      set((state) => ({
        stats,
        sellers,
        riders,
        buyers,
        orders,
        loading: {
          ...state.loading,
          stats: false,
          sellers: false,
          riders: false,
          buyers: false,
          orders: false,
        },
      }));
    } catch (error) {
      set((state) => ({
        loading: {
          ...state.loading,
          stats: false,
          sellers: false,
          riders: false,
          buyers: false,
          orders: false,
        },
      }));
      throw error;
    }
  },

  updateSellerStatus: async (sellerProfileId, status) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.updateSellerStatus(sellerProfileId, status);
      const sellers = await adminService.getSellers();
      const stats = await adminService.getDashboardStats();
      set((state) => ({
        sellers,
        stats,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },

  addRider: async (payload) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.addRider(payload);
      const [riders, stats] = await Promise.all([
        adminService.getRiders(),
        adminService.getDashboardStats(),
      ]);
      set((state) => ({
        riders,
        stats,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },

  toggleRiderStatus: async (userId) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.toggleRiderStatus(userId);
      const riders = await adminService.getRiders();
      set((state) => ({
        riders,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },

  removeRider: async (userId) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.removeRider(userId);
      const [riders, stats] = await Promise.all([
        adminService.getRiders(),
        adminService.getDashboardStats(),
      ]);
      set((state) => ({
        riders,
        stats,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },

  disableBuyer: async (userId) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.disableBuyer(userId);
      const buyers = await adminService.getBuyers();
      set((state) => ({
        buyers,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },

  fetchOrders: async (orderStatus = "all") => {
    set((state) => ({ loading: { ...state.loading, orders: true } }));

    try {
      const orders = await adminService.getOrders(orderStatus);
      set((state) => ({
        orders,
        loading: { ...state.loading, orders: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, orders: false } }));
      throw error;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set((state) => ({ loading: { ...state.loading, action: true } }));
    try {
      await adminService.updateOrderStatus(orderId, status);
      const [orders, stats] = await Promise.all([
        adminService.getOrders("all"),
        adminService.getDashboardStats(),
      ]);
      set((state) => ({
        orders,
        stats,
        loading: { ...state.loading, action: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, action: false } }));
      throw error;
    }
  },
}));
