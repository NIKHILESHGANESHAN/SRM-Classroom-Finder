"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` for PWA installability (Chromium criteria).
 * Runs on localhost and production so local install testing works.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[pwa] service worker registration failed", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
