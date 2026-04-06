import { apiClient } from "@/lib/api/client";
import { SellerRegistrationFormValues } from "@/types/seller-registration";

export const sellerService = {
  register: async (payload: SellerRegistrationFormValues) => {
    const formData = new FormData();

    formData.append("fullName", payload.fullName);
    formData.append("phoneNumber", payload.phoneNumber);
    formData.append("email", payload.email);
    formData.append("password", payload.password);
    formData.append("storeName", payload.storeName);
    formData.append("storeType", payload.storeType);
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
