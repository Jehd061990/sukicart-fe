import { apiClient } from "@/lib/api/client";
import {
  BranchesResponse,
  BranchMutationResponse,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "@/types/subscription";

export const branchService = {
  listBranches: async () => {
    const { data } = await apiClient.get<BranchesResponse>("/branches");
    return data;
  },

  createBranch: async (payload: CreateBranchPayload) => {
    const { data } = await apiClient.post<BranchMutationResponse>("/branches", payload);
    return data;
  },

  updateBranch: async (id: string, payload: UpdateBranchPayload) => {
    const { data } = await apiClient.patch<BranchMutationResponse>(`/branches/${id}`, payload);
    return data;
  },

  deleteBranch: async (id: string) => {
    const { data } = await apiClient.delete<BranchMutationResponse>(`/branches/${id}`);
    return data;
  },
};
