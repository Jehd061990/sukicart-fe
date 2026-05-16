import { apiClient } from "@/lib/api/client";

interface CloudinaryDeleteResponse {
  message: string;
  publicId: string;
  result: "ok" | "not found" | string;
}

export const imageAssetService = {
  deleteCloudinaryImage: async (publicId: string) => {
    const { data } = await apiClient.delete<CloudinaryDeleteResponse>(
      "/image-assets/cloudinary",
      {
        data: { publicId },
      },
    );

    return data;
  },
};
