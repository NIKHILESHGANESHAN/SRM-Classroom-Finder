import type { MetadataRoute } from "next";

/**
 * Web App Manifest — served at `/manifest.webmanifest` (Next.js App Router).
 * Enables Add to Home Screen / install prompts with standalone display.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SRM KTR Classroom Finder",
    short_name: "Classroom Finder",
    description:
      "Find free classrooms at SRM Kattankulathur (UB / TP1 / TP2). Anonymous crowd reports — no login.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0F2C59",
    theme_color: "#0F2C59",
    categories: ["education", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
