import { renderSkyPoster } from "./skyChart";
import type { CivilDate, SkyModel } from "./sky";
import { formatIsoDate } from "./share";

export function shareImageFilename(date: CivilDate): string {
  return `birthday-over-jezero-${formatIsoDate(date)}.jpg`;
}

async function waitForShareFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("400 18px Outfit"),
        document.fonts.load("400 15px Outfit"),
      ]),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 700);
      }),
    ]);
  } catch {
    /* fall back to Helvetica / system-ui */
  }
}

export async function composeShareImage(
  sky: SkyModel,
  date: CivilDate,
): Promise<HTMLCanvasElement> {
  await waitForShareFonts();
  return renderSkyPoster(sky, date);
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
