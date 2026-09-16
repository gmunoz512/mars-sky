import groundUrl from "../assets/mars/jezero-ground.jpg";
import horizonUrl from "../assets/mars/jezero-horizon.jpg";
import { fadeGroundRimImage, fadePhotoImage } from "./surfaceFade";

export type SurfaceMaps = {
  ground: HTMLCanvasElement;
  horizon: HTMLCanvasElement;
};

let pending: Promise<SurfaceMaps> | null = null;
let ready: SurfaceMaps | null = null;

async function loadImage(url: string): Promise<CanvasImageSource> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  return blobToImage(blob);
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("image decode failed"));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Decode + CPU-fade Jezero ground/horizon once, before the zoom tween.
 * Safe to call from orbit idle and again from Zoom in — same promise.
 */
export function preloadSurfaceTextures(): Promise<SurfaceMaps> {
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;
  pending = (async () => {
    const [groundImg, horizonImg] = await Promise.all([
      loadImage(groundUrl),
      loadImage(horizonUrl),
    ]);
    const maps: SurfaceMaps = {
      ground: fadeGroundRimImage(groundImg),
      horizon: fadePhotoImage(horizonImg, { top: 0.06 }),
    };
    if ("close" in groundImg && typeof groundImg.close === "function") groundImg.close();
    if ("close" in horizonImg && typeof horizonImg.close === "function") horizonImg.close();
    ready = maps;
    return maps;
  })().catch((err) => {
    pending = null;
    throw err;
  });
  return pending;
}

export function surfaceTexturesReady(): boolean {
  return ready !== null;
}
