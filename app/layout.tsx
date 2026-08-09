import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SRM KTR Classroom Finder",
    template: "%s · SRM KTR Classroom Finder",
  },
  description:
    "Find free classrooms at SRM KTR (UB, TP1, TP2) in real time. Anonymous contributor reports — no login required.",
  applicationName: "SRM KTR Classroom Finder",
  authors: [{ name: "NikhileshGaneshan" }, { name: "Sabrina" }],
  keywords: [
    "SRM",
    "KTR",
    "Kattankulathur",
    "classroom",
    "free room",
    "UB",
    "TP1",
    "TP2",
  ],
  creator: "NikhileshGaneshan & Sabrina",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Classroom Finder",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    siteName: "SRM KTR Classroom Finder",
    title: "SRM KTR Classroom Finder",
    description:
      "Find free classrooms at SRM Kattankulathur (UB / TP1 / TP2). Anonymous crowd reports — no login.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "SRM KTR Classroom Finder",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SRM KTR Classroom Finder",
    description:
      "Find free classrooms at SRM KTR (UB, TP1, TP2). Anonymous reports — no login.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F2C59" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2C59" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
