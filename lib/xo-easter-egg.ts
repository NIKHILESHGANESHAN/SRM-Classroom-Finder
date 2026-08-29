/**
 * XO Easter Egg unlock — keyboard sequence detection (client-safe).
 */

/** Type "xo" anywhere outside an input to unlock the mini-game. */
export const XO_UNLOCK_SEQUENCE = ["x", "o"] as const;

export type UnlockSequenceResult = {
  buffer: string[];
  unlocked: boolean;
};

export function trackUnlockSequence(
  buffer: readonly string[],
  key: string,
): UnlockSequenceResult {
  const lower = key.length === 1 ? key.toLowerCase() : "";
  if (!lower || !/^[a-z]$/.test(lower)) {
    return { buffer: [...buffer], unlocked: false };
  }

  const next = [...buffer, lower].slice(-XO_UNLOCK_SEQUENCE.length);
  const unlocked =
    next.length === XO_UNLOCK_SEQUENCE.length &&
    next.every((char, index) => char === XO_UNLOCK_SEQUENCE[index]);

  return {
    buffer: unlocked ? [] : next,
    unlocked,
  };
}

/** True when the event target is an editable field — skip unlock tracking. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest === "function") {
    return Boolean(el.closest("[contenteditable='true']"));
  }
  return false;
}
