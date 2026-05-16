"use client";

import Image from "next/image";
import {
  buildCloudinaryBlurDataUrl,
  getCloudinaryCloudNameFromUrl,
  resolveThumbnailFromAsset,
} from "@/lib/cloudinary/transform";
import type { ProductImageAsset } from "@/types/product";

interface LazyInventoryImageProps {
  name: string;
  image?: string;
  images?: ProductImageAsset[];
  size?: number;
  className?: string;
}

const NEXT_IMAGE_ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "encrypted-tbn0.gstatic.com",
  "upload.wikimedia.org",
  "cdn.store-assets.com",
  "ever.ph",
]);

const canUseNextImage = (value: string) => {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return NEXT_IMAGE_ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
};

export function LazyInventoryImage({
  name,
  image,
  images,
  size = 52,
  className,
}: LazyInventoryImageProps) {
  const asset = images?.[0];
  const src = resolveThumbnailFromAsset(asset, image);

  if (!src) {
    return (
      <div
        className={className || "rounded-lg bg-slate-100 ring-1 ring-slate-200"}
        style={{ width: size, height: size }}
      />
    );
  }

  const cloudName = getCloudinaryCloudNameFromUrl(asset?.url || src);
  const blurDataURL =
    cloudName && asset?.publicId
      ? buildCloudinaryBlurDataUrl({ cloudName, publicId: asset.publicId })
      : undefined;
  const useNextImage = canUseNextImage(src);

  return (
    <div
      className={className || "relative overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"}
      style={{ width: size, height: size }}
    >
      {useNextImage ? (
        <Image
          src={src}
          alt={name}
          fill
          loading="lazy"
          sizes={`${size}px`}
          className="object-cover"
          placeholder={blurDataURL ? "blur" : "empty"}
          blurDataURL={blurDataURL}
        />
      ) : (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
