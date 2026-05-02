import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SukiCart",
    short_name: "SukiCart",
    description: "SukiCart offline-ready POS and marketplace operations app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#2f9257",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
    ],
  };
}
