import { apiClient } from "@/lib/api/client";
import {
  SellerDashboardIncomePreset,
  SellerDashboardIncomeResponse,
  SellerDashboardSummaryResponse,
} from "@/types/seller-dashboard";
import { SellerRegistrationFormValues } from "@/types/seller-registration";

export const sellerService = {
  getDashboardSummary: async () => {
    const { data } = await apiClient.get<SellerDashboardSummaryResponse>("/sellers/dashboard-summary");
    return data;
  },

  getDashboardIncome: async (filters: {
    preset: SellerDashboardIncomePreset;
    from?: string;
    to?: string;
    branchPage?: number;
    branchLimit?: number;
    branchId?: string;
    terminalPage?: number;
    terminalLimit?: number;
  }) => {
    const params = new URLSearchParams();
    params.set("preset", filters.preset);

    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }

    if (typeof filters.branchPage === "number") {
      params.set("branchPage", String(filters.branchPage));
    }

    if (typeof filters.branchLimit === "number") {
      params.set("branchLimit", String(filters.branchLimit));
    }

    if (filters.branchId) {
      params.set("branchId", filters.branchId);
    }

    if (typeof filters.terminalPage === "number") {
      params.set("terminalPage", String(filters.terminalPage));
    }

    if (typeof filters.terminalLimit === "number") {
      params.set("terminalLimit", String(filters.terminalLimit));
    }

    const query = params.toString();
    const { data } = await apiClient.get<SellerDashboardIncomeResponse>(
      `/sellers/dashboard-income${query ? `?${query}` : ""}`,
    );
    return data;
  },

  register: async (payload: SellerRegistrationFormValues) => {
    const formData = new FormData();

    formData.append("fullName", payload.fullName);
    formData.append("phoneNumber", payload.phoneNumber);
    formData.append("email", payload.email);
    formData.append("password", payload.password);
    formData.append("storeName", payload.storeName);
    formData.append("storeType", payload.storeType);
    formData.append("preferredPOSMode", payload.preferredPOSMode);
    formData.append("marketLocation", payload.marketLocation || "");
    formData.append("exactAddress", payload.exactAddress || "");
    formData.append("handleOwnDelivery", String(payload.handleOwnDelivery));
    formData.append("usePlatformRiders", String(payload.usePlatformRiders));
    formData.append("acceptTerms", String(payload.acceptTerms));

    if (payload.dtiPermit) {
      formData.append("dtiPermit", payload.dtiPermit);
    }

    if (payload.validId) {
      formData.append("validId", payload.validId);
    }

    const { data } = await apiClient.post("/sellers/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};
