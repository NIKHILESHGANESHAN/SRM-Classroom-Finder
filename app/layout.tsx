import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeScript } from "@/components/theme/theme-script";
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from "@/lib/design-tokens";
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
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTOR,
  applicationName: PRODUCT_NAME,
  keywords: [
    "ClassFinder",
    "SRM",
    "KTR",
    "Kattankulathur",
    "classroom",
    "free room",
    "UB",
    "TP1",
    "TP2",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PRODUCT_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    siteName: PRODUCT_NAME,
    title: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTOR,
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: PRODUCT_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTOR,
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAECF0" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
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
        <ThemeScript />
        <Providers>
          <PwaRegister />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Skip to main content
          </a>
          <div id="main-content" className="min-w-0">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
