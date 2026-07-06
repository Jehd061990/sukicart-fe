"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cloudinaryService } from "@/lib/cloudinary/cloudinaryService";
import {
  compressImageForUpload,
  validateUploadFile,
} from "@/lib/images/imageCompressionUtil";
import type { ProductImageAsset } from "@/types/product";

export interface UploadingImageItem {
  id: string;
  fileName: string;
  previewUrl: string;
  progress: number;
  stage: "compressing" | "uploading" | "error";
  error?: string;
}

export function useCloudinaryUpload(options: {
  folder: string;
  maxFiles?: number;
  onUploaded: (asset: ProductImageAsset) => void;
}) {
  const { folder, maxFiles = 8, onUploaded } = options;
  const [uploadingItems, setUploadingItems] = useState<UploadingImageItem[]>([]);

  const setUploadProgress = (id: string, progress: number) => {
    setUploadingItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              progress,
            }
          : item,
      ),
    );
  };

  const removeUploadingItem = (id: string) => {
    setUploadingItems((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return prev.filter((entry) => entry.id !== id);
    });
  };

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setUploadingItems((prev) => [
        ...prev,
        {
          id: uploadId,
          fileName: file.name,
          previewUrl,
          progress: 0,
          stage: "compressing",
        },
      ]);

      try {
        validateUploadFile(file);
        const optimizedFile = await compressImageForUpload(file);

        setUploadingItems((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  stage: "uploading",
                  progress: 15,
                }
              : item,
          ),
        );

        const uploaded = await cloudinaryService.uploadUnsignedImage(optimizedFile, {
          folder,
          onProgress: (progress) => setUploadProgress(uploadId, progress),
        });

        onUploaded(uploaded);
        removeUploadingItem(uploadId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload image";

        setUploadingItems((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  stage: "error",
                  error: message,
                }
              : item,
          ),
        );
        toast.error(message);
      }
    },
    [folder, onUploaded],
  );

  const uploadFiles = useCallback(
    async (files: File[], currentCount: number) => {
      const slots = Math.max(0, maxFiles - currentCount);
      if (slots <= 0) {
        toast.error(`You can upload up to ${maxFiles} images only.`);
        return;
      }

      const selected = files.slice(0, slots);
      if (files.length > selected.length) {
        toast.error(`Only ${slots} more image(s) can be added.`);
      }

      const uploadJobs: Promise<void>[] = [];
      const seenFingerprintsInBatch = new Set<string>();

      for (const file of selected) {
        const fingerprint = `${file.name}-${file.size}-${file.lastModified}`;

        if (seenFingerprintsInBatch.has(fingerprint)) {
          toast.error(`Duplicate file skipped: ${file.name}`);
          continue;
        }

        seenFingerprintsInBatch.add(fingerprint);
        uploadJobs.push(uploadFile(file));
      }

      if (uploadJobs.length > 0) {
        await Promise.all(uploadJobs);
      }
    },
    [maxFiles, uploadFile],
  );

  const retryUpload = async (upload: UploadingImageItem) => {
    const response = await fetch(upload.previewUrl);
    const blob = await response.blob();
    const file = new File([blob], upload.fileName, {
      type: blob.type || "image/webp",
      lastModified: Date.now(),
    });

    removeUploadingItem(upload.id);
    await uploadFile(file);
  };

  return {
    uploadingItems,
    uploadFiles,
    removeUploadingItem,
    retryUpload,
  };
}
