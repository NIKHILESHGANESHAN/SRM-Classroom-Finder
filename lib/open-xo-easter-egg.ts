/** Custom event for opening the global XO Easter Egg dialog from anywhere in the app. */
export const XO_EASTER_EGG_OPEN_EVENT = "cf:open-xo-easter-egg";

/** Request the deferred XO dialog to open (no-op on the server). */
export function openXoEasterEgg(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(XO_EASTER_EGG_OPEN_EVENT));
}

/** Subscribe to XO open requests — returns an unsubscribe function. */
export function subscribeXoEasterEggOpen(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(XO_EASTER_EGG_OPEN_EVENT, handler);
  return () => window.removeEventListener(XO_EASTER_EGG_OPEN_EVENT, handler);
}
