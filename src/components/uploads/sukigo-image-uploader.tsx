"use client";

import { ImageUploadDropzone } from "@/components/uploads/ImageUploadDropzone";
import type { ProductImageAsset } from "@/types/product";

interface SukiGoImageUploaderProps {
  value: ProductImageAsset[];
  onChange: (nextImages: ProductImageAsset[]) => void;
  folder: string;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function SukiGoImageUploader({
  value,
  onChange,
  folder,
  maxFiles = 8,
  disabled,
  className,
}: SukiGoImageUploaderProps) {
  return (
    <ImageUploadDropzone
      value={value}
      onChange={onChange}
      folder={folder}
      maxFiles={maxFiles}
      disabled={disabled}
      className={className}
    />
  );
}
