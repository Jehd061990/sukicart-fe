import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-green-50)",
          100: "var(--brand-green-100)",
          200: "var(--brand-green-200)",
          300: "var(--brand-green-300)",
          400: "var(--brand-green-400)",
          500: "var(--brand-green-500)",
          600: "var(--brand-green-600)",
          700: "var(--brand-green-700)",
          800: "var(--brand-green-800)",
          900: "var(--brand-green-900)",
        },
        deal: {
          50: "var(--brand-orange-50)",
          100: "var(--brand-orange-100)",
          200: "var(--brand-orange-200)",
          300: "var(--brand-orange-300)",
          400: "var(--brand-orange-400)",
          500: "var(--brand-orange-500)",
          600: "var(--brand-orange-600)",
          700: "var(--brand-orange-700)",
          800: "var(--brand-orange-800)",
          900: "var(--brand-orange-900)",
        },
      },
      fontFamily: {
        heading: [
          "var(--font-poppins)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
