"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_ORIGINAL_FILE_SIZE_BYTES,
} from "@/lib/images/imageCompressionUtil";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { ImagePreviewGrid } from "@/components/uploads/ImagePreviewGrid";
import { imageAssetService } from "@/lib/api/services/image-asset.service";
import type { ProductImageAsset } from "@/types/product";
import type { CategoryThumbnailShape } from "@/types/store-config";

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function ImageUploadDropzone({
  value,
  onChange,
  folder,
  maxFiles = 8,
  disabled,
  className,
  previewShape = "rounded",
}: {
  value: ProductImageAsset[];
  onChange: (nextImages: ProductImageAsset[]) => void;
  folder: string;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  previewShape?: CategoryThumbnailShape;
}) {
  const cameraInputId = useMemo(() => `camera-${crypto.randomUUID()}`, []);
  const [removingPublicIds, setRemovingPublicIds] = useState<string[]>([]);

  const {
    uploadingItems,
    uploadFiles,
    removeUploadingItem,
    retryUpload,
  } = useCloudinaryUpload({
    folder,
    maxFiles,
    onUploaded: (asset) => {
      onChange([...value, asset]);
    },
  });

  const canAddMore = value.length + uploadingItems.length < maxFiles;

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      noClick: true,
      noKeyboard: true,
      disabled,
      multiple: true,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_ORIGINAL_FILE_SIZE_BYTES,
      onDrop: async (acceptedFiles) => {
        await uploadFiles(acceptedFiles, value.length);
      },
      onDropRejected: () => {
        // validation feedback is provided by utility + toast in hook
      },
    });

  const isBusy = uploadingItems.some(
    (item) => item.stage === "compressing" || item.stage === "uploading",
  );

  const handleRemoveImage = async (asset: ProductImageAsset) => {
    if (!asset.publicId || removingPublicIds.includes(asset.publicId)) {
      return;
    }

    setRemovingPublicIds((current) => [...current, asset.publicId]);

    try {
      await imageAssetService.deleteCloudinaryImage(asset.publicId);
      onChange(value.filter((entry) => entry.publicId !== asset.publicId));
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : "Failed to remove image from Cloudinary. Please try again.";
      toast.error(message);
    } finally {
      setRemovingPublicIds((current) =>
        current.filter((publicId) => publicId !== asset.publicId),
      );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "group rounded-2xl border border-dashed p-5 transition",
          isDragActive
            ? "border-brand-500 bg-brand-50/70"
            : "border-slate-300 bg-slate-50/70 hover:border-brand-400 hover:bg-brand-50/40",
          isDragReject && "border-rose-400 bg-rose-50",
          disabled && "cursor-not-allowed opacity-70",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <UploadCloud className="h-5 w-5 text-brand-700" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Drag and drop images here</p>
          <p className="text-xs text-slate-500">
            JPG, PNG, WEBP up to 2MB original. Auto-converted and compressed to WebP.
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !canAddMore}
              onClick={open}
            >
              Click to Upload
            </Button>

            <label htmlFor={cameraInputId}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || !canAddMore}
              >
                <span>
                  <Camera className="mr-1.5 h-4 w-4" />
                  Use Camera
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      <input
        id={cameraInputId}
        type="file"
        className="hidden"
        accept={ACCEPTED_UPLOAD_MIME_TYPES.join(",")}
        capture="environment"
        multiple
        onChange={async (event) => {
          const files = Array.from(event.target.files || []);
          await uploadFiles(files, value.length);
          event.currentTarget.value = "";
        }}
      />

      <ImagePreviewGrid
        images={value}
        uploadingItems={uploadingItems}
        isBusy={isBusy}
        previewShape={previewShape}
        removingPublicIds={removingPublicIds}
        onReorder={onChange}
        onRemoveImage={handleRemoveImage}
        onRetryUpload={retryUpload}
        onDismissUpload={removeUploadingItem}
      />
    </div>
  );
}
