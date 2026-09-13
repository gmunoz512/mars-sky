import { JEZERO } from "./jezero";
import type { Vec3 } from "./math";
import { rad } from "./math";

/** Jezero as a unit vector in Mars body-fixed (IAU +X Airy-0, +Z north). */
export function jezeroUnitFixed(): Vec3 {
  return latLonUnitFixed(JEZERO.latitudeDeg, JEZERO.longitudeEastDeg);
}

/** Melas / Coprates — the canyon scar on the classic Mars portrait. */
export const VALLES_MARINERIS = { latitudeDeg: -13.9, longitudeEastDeg: -59.2 };

/** Frame Valles Marineris plus the Tharsis volcanoes, as in a Viking-era globe. */
export const PORTRAIT_FACE = { latitudeDeg: -8.0, longitudeEastDeg: -78.0 };

export function portraitFaceUnitFixed(): Vec3 {
  return latLonUnitFixed(PORTRAIT_FACE.latitudeDeg, PORTRAIT_FACE.longitudeEastDeg);
}

export function vallesMarinerisUnitFixed(): Vec3 {
  return latLonUnitFixed(VALLES_MARINERIS.latitudeDeg, VALLES_MARINERIS.longitudeEastDeg);
}

export function latLonUnitFixed(latDeg: number, lonEastDeg: number): Vec3 {
  const lat = rad(latDeg);
  const lon = rad(lonEastDeg);
  const c = Math.cos(lat);
  return {
    x: c * Math.cos(lon),
    y: c * Math.sin(lon),
    z: Math.sin(lat),
  };
}

/** Body-fixed → Three.js with north as +Y. */
export function bodyFixedToThree(v: Vec3): Vec3 {
  return { x: v.x, y: v.z, z: -v.y };
}

/** Yaw that faces a body-fixed site toward the camera on +Z. */
export function yawToFaceCamera(v: Vec3): number {
  const t = bodyFixedToThree(v);
  return -Math.atan2(t.x, t.z);
}

export const GLOBE_CREDIT = "NASA/JPL/USGS";

export const GLOBE_SOURCES = [
  {
    id: "MDIM21",
    title: "Mars Viking MDIM 2.1 colorized global mosaic",
    url: "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
    role: "orbit albedo + derived bump",
  },
] as const;

/**
 * Coarse seasonal frost width in degrees of latitude from each pole.
 * Northern summer (Ls ≈ 90°) shrinks the north residual cap.
 */
export function polarCapExtents(lsDeg: number): { northDeg: number; southDeg: number } {
  const swing = 7 * Math.cos(((lsDeg - 90) * Math.PI) / 180);
  return { northDeg: 12 - swing, southDeg: 12 + swing };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Draw the Viking mosaic, warm it toward the classic ochre portrait,
 * and add a light seasonal frost overlay.
 */
export function composeGlobeAlbedo(source: CanvasImageSource, lsDeg: number): HTMLCanvasElement {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, w, h);

  const { northDeg, southDeg } = polarCapExtents(lsDeg);
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let y = 0; y < h; y += 1) {
    const lat = 90 - (y / (h - 1)) * 180;
    let cap = 0;
    if (lat > 90 - northDeg) cap = (lat - (90 - northDeg)) / northDeg;
    else if (lat < -90 + southDeg) cap = (-90 + southDeg - lat) / southDeg;
    const frost = Math.min(1, Math.max(0, cap)) ** 1.35 * 0.32;
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      // JPEG is already warmed; keep canyon darks and only a light ochre nudge.
      let r = data[i]! * 1.04 + 2;
      let g = data[i + 1]! * 1.01;
      let b = data[i + 2]! * 0.94;
      const mid = (r + g + b) / 3;
      r = mid + (r - mid) * 1.18;
      g = mid + (g - mid) * 1.16;
      b = mid + (b - mid) * 1.14;
      r = r + (236 - r) * frost;
      g = g + (228 - g) * frost;
      b = b + (216 - b) * frost;
      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
