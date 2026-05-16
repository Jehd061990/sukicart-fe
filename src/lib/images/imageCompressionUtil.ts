import imageCompression from "browser-image-compression";

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_ORIGINAL_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const TARGET_UPLOAD_SIZE_MB = 0.1;
export const TARGET_UPLOAD_SIZE_BYTES = 120 * 1024;
export const MAX_WIDTH_OR_HEIGHT = 1200;

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image for conversion"));
    };

    image.src = objectUrl;
  });

const replaceFileExtension = (name: string, extension: string) =>
  name.replace(/\.[^.]+$/, "") + extension;

export const validateUploadFile = (file: File) => {
  if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_MIME_TYPES)[number])) {
    throw new Error("Unsupported file type. Use JPG, PNG, or WEBP only.");
  }

  if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Maximum original file size is 2MB.");
  }
};

export const convertImageToWebP = async (
  file: File,
  quality = 0.84,
): Promise<File> => {
  if (file.type === "image/webp") {
    return file;
  }

  const image = await loadImageElement(file);
  const ratio = Math.min(1, MAX_WIDTH_OR_HEIGHT / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported in this browser");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (!output) {
          reject(new Error("Failed to convert image to WebP"));
          return;
        }

        resolve(output);
      },
      "image/webp",
      quality,
    );
  });

  return new File([blob], replaceFileExtension(file.name, ".webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
};

export const compressImageForUpload = async (file: File): Promise<File> => {
  const webpFile = await convertImageToWebP(file, 0.86);

  const firstPass = await imageCompression(webpFile, {
    maxSizeMB: TARGET_UPLOAD_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    fileType: "image/webp",
    initialQuality: 0.78,
    useWebWorker: true,
  });

  if (firstPass.size <= TARGET_UPLOAD_SIZE_BYTES) {
    return firstPass;
  }

  return imageCompression(firstPass, {
    maxSizeMB: TARGET_UPLOAD_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    fileType: "image/webp",
    initialQuality: 0.68,
    useWebWorker: true,
  });
};
