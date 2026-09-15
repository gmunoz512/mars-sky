import { formatIsoDate, formatShareHeadline, type ShareState, type ViewMode } from "./share";
import type { CivilDate } from "./sky";

export type CaptureFrame = () => HTMLCanvasElement | null;

export const SHARE_IMAGE_MAX_EDGE = 1600;

export type ShareImageCaption = {
  kicker: string;
  headline: string;
  place: string;
};

export function shareImageCaption(date: CivilDate, view: ViewMode): ShareImageCaption {
  return {
    kicker: "birthday over Jezero",
    headline: formatShareHeadline(date),
    place: view === "surface" ? "Jezero crater" : "Mars from orbit",
  };
}

export function shareImageFilename(date: CivilDate): string {
  return `birthday-over-jezero-${formatIsoDate(date)}.jpg`;
}

export function shareImageSize(
  srcW: number,
  srcH: number,
  maxEdge = SHARE_IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

export function capturePreferredView(
  preferSky: boolean,
  sky: CaptureFrame | null | undefined,
  globe: CaptureFrame | null | undefined,
): HTMLCanvasElement | null {
  const first = preferSky ? sky : globe;
  const second = preferSky ? globe : sky;
  return first?.() ?? second?.() ?? null;
}

async function waitForShareFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("560 42px Fraunces"),
        document.fonts.load("400 18px Outfit"),
        document.fonts.load("500 14px Outfit"),
      ]),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 700);
      }),
    ]);
  } catch {
    /* fall back to Times / system-ui */
  }
}

export async function composeShareImage(
  source: HTMLCanvasElement,
  state: Pick<ShareState, "date" | "view">,
): Promise<HTMLCanvasElement> {
  if (source.width < 2 || source.height < 2) {
    throw new Error("Sky view was too small to capture");
  }
  await waitForShareFonts();
  const { width, height } = shareImageSize(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compose share image");

  ctx.fillStyle = "#07060a";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const caption = shareImageCaption(state.date, state.view);
  const unit = Math.min(width, height);
  const pad = unit * 0.055;

  const fade = ctx.createLinearGradient(0, height * 0.58, 0, height);
  fade.addColorStop(0, "rgba(7, 6, 10, 0)");
  fade.addColorStop(0.48, "rgba(7, 6, 10, 0.32)");
  fade.addColorStop(1, "rgba(7, 6, 10, 0.82)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(7, 6, 10, 0.75)";
  ctx.shadowBlur = unit * 0.018;
  ctx.shadowOffsetY = unit * 0.003;

  const placeY = height - pad;
  const kickerY = placeY - unit * 0.04;
  const headlineY = kickerY - unit * 0.05;

  ctx.fillStyle = "#e8e2d6";
  ctx.font = `560 ${Math.round(unit * 0.052)}px Fraunces, "Times New Roman", serif`;
  ctx.fillText(caption.headline, pad, headlineY);

  ctx.fillStyle = "#d4cdc0";
  ctx.font = `400 ${Math.round(unit * 0.026)}px Outfit, system-ui, sans-serif`;
  ctx.fillText(caption.kicker, pad, kickerY);

  ctx.fillStyle = "#c47a4a";
  ctx.font = `500 ${Math.round(unit * 0.02)}px Outfit, system-ui, sans-serif`;
  ctx.fillText(caption.place, pad, placeY);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return canvas;
}

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
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
