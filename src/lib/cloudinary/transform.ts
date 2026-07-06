import type { ProductImageAsset } from "@/types/product";

export const CLOUDINARY_HOST = "res.cloudinary.com";

export const isCloudinaryUrl = (value?: string | null) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
};

export const getCloudinaryCloudNameFromUrl = (value?: string | null) => {
  if (!isCloudinaryUrl(value)) {
    return null;
  }

  const parsed = new URL(String(value));
  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments[0] || null;
};

export const buildCloudinaryDeliveryUrl = ({
  cloudName,
  publicId,
  transformations = ["f_auto", "q_auto"],
}: {
  cloudName: string;
  publicId: string;
  transformations?: string[];
}) => {
  const transformChunk = transformations.filter(Boolean).join(",");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformChunk}/${publicId}`;
};

export const buildCloudinaryThumbnailUrl = ({
  cloudName,
  publicId,
  size = 300,
}: {
  cloudName: string;
  publicId: string;
  size?: number;
}) =>
  buildCloudinaryDeliveryUrl({
    cloudName,
    publicId,
    transformations: [
      `c_fill`,
      `g_auto`,
      `w_${size}`,
      `h_${size}`,
      "f_webp",
      "q_auto:good",
    ],
  });

export const buildCloudinaryBlurDataUrl = ({
  cloudName,
  publicId,
}: {
  cloudName: string;
  publicId: string;
}) =>
  buildCloudinaryDeliveryUrl({
    cloudName,
    publicId,
    transformations: [
      "c_fill",
      "g_auto",
      "w_24",
      "h_24",
      "f_webp",
      "q_20",
      "e_blur:800",
    ],
  });

export const resolveThumbnailFromAsset = (
  asset?: ProductImageAsset,
  fallbackImage?: string,
) => {
  if (asset?.thumbnailUrl) {
    return asset.thumbnailUrl;
  }

  if (asset?.url) {
    return asset.url;
  }

  return fallbackImage || "";
};
