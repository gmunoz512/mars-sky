import { JEZERO } from "./jezero";
import type { Vec3 } from "./math";
import { rad } from "./math";

/** Jezero as a unit vector in Mars body-fixed (IAU +X Airy-0, +Z north). */
export function jezeroUnitFixed(): Vec3 {
  const lat = rad(JEZERO.latitudeDeg);
  const lon = rad(JEZERO.longitudeEastDeg);
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

/**
 * Draw the Viking mosaic and a light seasonal frost overlay.
 * Mosaic already carries typical caps; this only breathes them with Ls.
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
    let t = 0;
    if (lat > 90 - northDeg) t = (lat - (90 - northDeg)) / northDeg;
    else if (lat < -90 + southDeg) t = (-90 + southDeg - lat) / southDeg;
    if (t <= 0) continue;
    const fade = Math.min(1, Math.max(0, t)) ** 1.35 * 0.42;
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      data[i] = Math.round(data[i]! + (236 - data[i]!) * fade);
      data[i + 1] = Math.round(data[i + 1]! + (228 - data[i + 1]!) * fade);
      data[i + 2] = Math.round(data[i + 2]! + (216 - data[i + 2]!) * fade);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
