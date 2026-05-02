import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider } from "@/providers/app-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SukiCart Dashboard",
  description: "SukiCart frontend control panel",
  manifest: "/manifest.webmanifest",
  applicationName: "SukiCart",
  themeColor: "#2f9257",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SukiCart",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
