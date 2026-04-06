import { apiClient } from "@/lib/api/client";
import { BuyerRegistrationFormValues } from "@/types/buyer-registration";

export const buyerService = {
  register: async (payload: BuyerRegistrationFormValues) => {
    const body = {
      ...payload,
      email: payload.email || undefined,
      landmark: payload.landmark || "",
      notes: payload.notes || "",
    };

    const { data } = await apiClient.post("/buyers/register", body);
    return data;
  },
};
