import type { ProductImageAsset } from "@/types/product";
import {
  buildCloudinaryThumbnailUrl,
  getCloudinaryCloudNameFromUrl,
} from "@/lib/cloudinary/transform";

export interface CloudinaryUploadOptions {
  folder?: string;
  tags?: string[];
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

const getCloudinaryConfig = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary config missing. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  return {
    cloudName,
    uploadPreset,
  };
};

const uploadWithProgress = (
  endpoint: string,
  formData: FormData,
  options: CloudinaryUploadOptions,
) =>
  new Promise<CloudinaryUploadResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", endpoint);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);
      options.onProgress?.(progress);
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const parsed = JSON.parse(request.responseText) as CloudinaryUploadResponse;
          resolve(parsed);
        } catch {
          reject(new Error("Failed to parse Cloudinary upload response"));
        }
        return;
      }

      let message = "Failed to upload image to Cloudinary";
      try {
        const parsed = JSON.parse(request.responseText) as { error?: { message?: string } };
        message = parsed.error?.message || message;
      } catch {
        // Keep generic message for non-json responses.
      }

      reject(new Error(message));
    };

    request.onerror = () => reject(new Error("Network error while uploading image"));
    request.onabort = () => reject(new Error("Image upload cancelled"));

    if (options.signal) {
      if (options.signal.aborted) {
        request.abort();
        return;
      }

      const abortListener = () => request.abort();
      options.signal.addEventListener("abort", abortListener, { once: true });
      request.addEventListener("loadend", () => {
        options.signal?.removeEventListener("abort", abortListener);
      });
    }

    request.send(formData);
  });

export const cloudinaryService = {
  uploadUnsignedImage: async (
    file: File,
    options: CloudinaryUploadOptions = {},
  ): Promise<ProductImageAsset> => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "image");

    if (options.folder) {
      formData.append("folder", options.folder);
    }

    if (options.tags?.length) {
      formData.append("tags", options.tags.join(","));
    }

    const response = await uploadWithProgress(endpoint, formData, options);
    const derivedCloudName =
      getCloudinaryCloudNameFromUrl(response.secure_url) || cloudName;

    return {
      url: response.secure_url,
      publicId: response.public_id,
      thumbnailUrl: buildCloudinaryThumbnailUrl({
        cloudName: derivedCloudName,
        publicId: response.public_id,
        size: 300,
      }),
      width: Number(response.width || 0),
      height: Number(response.height || 0),
      format: String(response.format || "webp").toLowerCase(),
    };
  },
};
