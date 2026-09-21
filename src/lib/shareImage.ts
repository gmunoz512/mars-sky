import { POSTER_HEIGHT, POSTER_WIDTH, renderSolarPoster, type PosterOptions } from "./solarPoster";
import type { CivilDate } from "./sky";
import { formatIsoDate } from "./share";

export const SHOW_BIRTHDAY_STORAGE_KEY = "birthday-in-mars:show-birthday-on-poster";

export function shareImageFilename(date: CivilDate): string {
  return `birthday-over-jezero-${formatIsoDate(date)}.jpg`;
}

function storageGet(storage: Pick<Storage, "getItem"> | null | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(storage: Pick<Storage, "setItem"> | null | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

export function posterPreferenceStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* ignore */
  }
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* ignore */
  }
  return null;
}

/** Default is show. Stored as "1" / "0". */
export function readShowBirthdayPreference(
  storage: Pick<Storage, "getItem"> | null = posterPreferenceStorage(),
): boolean {
  const raw = storageGet(storage, SHOW_BIRTHDAY_STORAGE_KEY);
  if (raw === "0") return false;
  if (raw === "1") return true;
  return true;
}

export function writeShowBirthdayPreference(
  show: boolean,
  storage: Pick<Storage, "setItem"> | null = posterPreferenceStorage(),
): void {
  storageSet(storage, SHOW_BIRTHDAY_STORAGE_KEY, show ? "1" : "0");
}

async function waitForShareFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("400 22px Fraunces"),
        document.fonts.load("italic 400 18px Fraunces"),
      ]),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 700);
      }),
    ]);
  } catch {
    /* fall back to Times / system serif */
  }
}

export async function composeShareImage(
  date: CivilDate,
  options?: PosterOptions,
): Promise<HTMLCanvasElement> {
  await waitForShareFonts();
  return renderSolarPoster(date, POSTER_WIDTH, POSTER_HEIGHT, options);
}

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.93): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not encode JPEG"));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 4000);
}

export function canShareImageFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}
