/** Smoothstep used by photo alpha ramps (not the camera tween). */
export function fadeSmooth01(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/**
 * Ground-disc rim alpha for a pixel at (x, y) in an image of size w×h.
 * Interior stays opaque; corners go to 0 so the disc does not read as a seam.
 */
export function groundRimAlpha(x: number, y: number, w: number, h: number): number {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  const maxR = Math.hypot(cx, cy);
  const t = Math.hypot(x - cx, y - cy) / maxR;
  if (t < 0.55) return 1;
  if (t > 0.98) return 0;
  return 1 - fadeSmooth01((t - 0.55) / 0.43);
}

/** Vertical fade used to blend the daylight photo into the midnight sky. */
export function photoTopAlpha(y: number, h: number, top = 0.2): number {
  const ty = y / Math.max(1, h - 1);
  return ty < top ? fadeSmooth01(ty / top) : 1;
}

function drawToCanvas(img: CanvasImageSource): HTMLCanvasElement {
  const w =
    "width" in img && typeof img.width === "number"
      ? img.width
      : (img as HTMLImageElement).naturalWidth;
  const h =
    "height" in img && typeof img.height === "number"
      ? img.height
      : (img as HTMLImageElement).naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/** Fade daylight sky (and optional side edges) so photos blend into midnight. */
export function fadePhotoImage(
  img: CanvasImageSource,
  opts?: { top?: number; side?: number },
): HTMLCanvasElement {
  const canvas = drawToCanvas(img);
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.getImageData(0, 0, w, h);
  const top = opts?.top ?? 0.2;
  const side = opts?.side ?? 0;
  // Only walk the fade band — the ridge/terrain rows stay alpha 255 so
  // distant hills are not softened by a full-image getImageData pass.
  const yFade = side > 0 ? h : Math.min(h, Math.ceil(top * h) + 1);
  for (let y = 0; y < yFade; y += 1) {
    const ay = photoTopAlpha(y, h, top);
    for (let x = 0; x < w; x += 1) {
      let a = ay;
      if (side > 0) {
        const tx = x / Math.max(1, w - 1);
        a *= fadeSmooth01(tx / side) * fadeSmooth01((1 - tx) / side);
      }
      data.data[(y * w + x) * 4 + 3] = Math.round(255 * a);
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** Soften the disc rim so it cannot read as a circular seam under the wrap. */
export function fadeGroundRimImage(img: CanvasImageSource): HTMLCanvasElement {
  const canvas = drawToCanvas(img);
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      data.data[(y * w + x) * 4 + 3] = Math.round(255 * groundRimAlpha(x, y, w, h));
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
