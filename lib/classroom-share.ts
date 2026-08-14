/**
 * V2.4 Finder share / deep-link helpers (client-safe).
 *
 * Public links use human-readable params:
 *   /finder?building=UB&floor=12&room=1205
 *
 * In-app filter navigation still uses existing building/floor IDs via
 * `buildFinderQuery`. Both forms are accepted when resolving on the server.
 *
 * Share URLs never include device tokens, report IDs, or slot/focus state.
 * The opener gets normal current-slot logic (omit `slot`).
 */

export type ShareClassroomInput = {
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
};

export function buildClassroomSharePath(input: ShareClassroomInput): string {
  const building = input.buildingCode.trim().toUpperCase();
  const room = input.roomNumber.trim();
  const floor = String(input.floorNumber);
  const q = new URLSearchParams();
  q.set("building", building);
  q.set("floor", floor);
  q.set("room", room);
  return `/finder?${q.toString()}`;
}

export function buildClassroomShareUrl(
  origin: string,
  input: ShareClassroomInput,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildClassroomSharePath(input)}`;
}

export function shareCopy(input: ShareClassroomInput): {
  title: string;
  text: string;
} {
  const label = `${input.buildingCode.trim().toUpperCase()} ${input.roomNumber.trim()}`;
  return {
    title: "SRM KTR Classroom Finder",
    text: `${label} is currently reported free.\n\nFloor ${input.floorNumber}\nSRM KTR Classroom Finder`,
  };
}

export function shareUrlContainsSecrets(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("cookie") ||
    lower.includes("secret") ||
    lower.includes("freereport") ||
    lower.includes("classroomid")
  );
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type ShareAdapters = {
  canShare: () => boolean;
  share: (data: {
    title: string;
    text: string;
    url: string;
  }) => Promise<void>;
  writeClipboard: (text: string) => Promise<void>;
};

export function isShareCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError";
}

/**
 * User-gesture share: Web Share when available, otherwise clipboard.
 * Cancellation is not treated as failure.
 */
export async function shareClassroomLink(
  input: ShareClassroomInput & { origin: string },
  adapters: ShareAdapters,
): Promise<ShareOutcome> {
  const url = buildClassroomShareUrl(input.origin, input);
  if (shareUrlContainsSecrets(url)) return "failed";
  const { title, text } = shareCopy(input);

  if (adapters.canShare()) {
    try {
      await adapters.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (isShareCancellation(error)) return "cancelled";
      // Fall through to clipboard
    }
  }

  try {
    await adapters.writeClipboard(url);
    return "copied";
  } catch {
    return "failed";
  }
}

export function browserShareAdapters(): ShareAdapters {
  return {
    canShare() {
      return typeof navigator !== "undefined" && typeof navigator.share === "function";
    },
    async share(data) {
      await navigator.share(data);
    },
    async writeClipboard(text) {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      copyWithTextarea(text);
    },
  };
}

function copyWithTextarea(text: string): void {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) throw new Error("copy_failed");
}
