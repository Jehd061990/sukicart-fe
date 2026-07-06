import {
  compressImageForUpload,
  convertImageToWebP,
  MAX_ORIGINAL_FILE_SIZE_BYTES,
  validateUploadFile as validateUploadFileInternal,
} from "@/lib/images/imageCompressionUtil";

export const validateUploadFile = (file: File, maxSizeBytes?: number) => {
  validateUploadFileInternal(file);

  if (typeof maxSizeBytes === "number" && file.size > maxSizeBytes) {
    throw new Error(
      `Image is too large. Max allowed size is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
    );
  }

  if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Maximum original file size is 2MB.");
  }
};

export { convertImageToWebP };

export const compressAndConvertImage = async (file: File): Promise<File> =>
  compressImageForUpload(file);
