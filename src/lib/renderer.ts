import type { WebGLRenderer } from "three";

/**
 * Match the drawing buffer to the host box, and keep canvas CSS at the
 * host size — never the device-pixel buffer. `setSize(w, h, false)` alone
 * leaves the canvas attributes at w*dpr × h*dpr; on a 2–3× phone that
 * overflows the viewport, so the globe is drawn in the center of a huge
 * canvas while the user only sees the top-left (planet in the corner,
 * HTML labels still centered).
 */
export function fitRendererToHost(
  renderer: WebGLRenderer,
  host: { clientWidth: number; clientHeight: number },
): { width: number; height: number } {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  if (width >= 2 && height >= 2) {
    renderer.setSize(width, height, false);
  }
  return { width, height };
}

/** CSS layout vs drawing-buffer size. Layout must follow the host, not dpr. */
export function canvasLayoutSize(
  hostW: number,
  hostH: number,
  pixelRatio: number,
): { cssW: number; cssH: number; bufferW: number; bufferH: number } {
  const dpr = Math.max(1, pixelRatio);
  return {
    cssW: hostW,
    cssH: hostH,
    bufferW: Math.floor(hostW * dpr),
    bufferH: Math.floor(hostH * dpr),
  };
}
