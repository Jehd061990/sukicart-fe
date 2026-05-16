"use client";

import { useState } from "react";
import { GripVertical, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImageAsset } from "@/types/product";
import type { UploadingImageItem } from "@/hooks/useCloudinaryUpload";
import type { CategoryThumbnailShape } from "@/types/store-config";

const reorderItems = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
};

export function ImagePreviewGrid({
  images,
  uploadingItems,
  isBusy,
  previewShape = "rounded",
  removingPublicIds = [],
  onReorder,
  onRemoveImage,
  onRetryUpload,
  onDismissUpload,
}: {
  images: ProductImageAsset[];
  uploadingItems: UploadingImageItem[];
  isBusy: boolean;
  previewShape?: CategoryThumbnailShape;
  removingPublicIds?: string[];
  onReorder: (nextImages: ProductImageAsset[]) => void;
  onRemoveImage: (asset: ProductImageAsset) => Promise<void> | void;
  onRetryUpload: (upload: UploadingImageItem) => Promise<void>;
  onDismissUpload: (uploadId: string) => void;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {images.map((asset, index) => {
        const isRemoving = removingPublicIds.includes(asset.publicId);

        return (
        <article
          key={asset.publicId}
          draggable
          onDragStart={() => setDraggingIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggingIndex === null || draggingIndex === index) {
              return;
            }

            onReorder(reorderItems(images, draggingIndex, index));
            setDraggingIndex(null);
          }}
          className={cn(
            "group relative overflow-hidden bg-white shadow-sm ring-1 ring-slate-200",
            shapeClass,
          )}
        >
          <img
            src={asset.thumbnailUrl || asset.url}
            alt="Uploaded product"
            className="aspect-square h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {index === 0 ? "Primary" : `#${index + 1}`}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-1 bg-black/60 p-2 transition group-hover:translate-y-0">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-700"
              onClick={() => void onRemoveImage(asset)}
              disabled={isRemoving}
              aria-label="Remove image"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
            <div className="inline-flex items-center gap-1 text-white/90">
              <GripVertical className="h-4 w-4" />
              <span className="text-[11px] font-semibold">Drag to reorder</span>
            </div>
          </div>
        </article>
        );
      })}

      {uploadingItems.map((item) => (
        <article
          key={item.id}
          className={cn(
            "relative overflow-hidden bg-white shadow-sm ring-1 ring-slate-200",
            shapeClass,
          )}
        >
          <img
            src={item.previewUrl}
            alt={item.fileName}
            className="aspect-square h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-slate-900/45 p-2 text-white">
            <div className="flex items-center justify-between text-xs">
              <span className="line-clamp-1 pr-2">{item.fileName}</span>
              {item.stage === "error" ? (
                <button
                  type="button"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900"
                  onClick={() => void onRetryUpload(item)}
                >
                  Retry
                </button>
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  item.stage === "error" ? "bg-rose-300" : "bg-emerald-300",
                )}
                style={{ width: `${Math.max(item.progress, item.stage === "compressing" ? 12 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium">
              {item.stage === "compressing"
                ? "Optimizing image..."
                : item.stage === "uploading"
                  ? `Uploading ${item.progress}%`
                  : item.error || "Upload failed"}
            </p>
          </div>
          <button
            type="button"
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
            onClick={() => onDismissUpload(item.id)}
            aria-label="Dismiss upload"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </article>
      ))}

      {Array.from({ length: Math.max(0, 2 - images.length) }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={cn(
            "aspect-square border border-dashed border-slate-300 bg-slate-100/70",
            shapeClass,
            isBusy && "animate-pulse",
          )}
        />
      ))}
    </div>
  );
}
