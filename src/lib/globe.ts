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

function hash2(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    v += a * valueNoise(x * f, y * f);
    a *= 0.5;
    f *= 2.05;
  }
  return v;
}

/**
 * Schematic Mars albedo (not a spacecraft mosaic).
 * Polar-cap size follows Ls in a coarse seasonal way.
 */
export function paintMarsGlobe(lsDeg: number): HTMLCanvasElement {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  const northCap = 12 + 7 * Math.cos(((lsDeg - 90) * Math.PI) / 180);
  const southCap = 12 - 7 * Math.cos(((lsDeg - 90) * Math.PI) / 180);

  for (let y = 0; y < h; y++) {
    const lat = 90 - (y / (h - 1)) * 180;
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const n = fbm(u * 6.2, v * 3.4);
      const n2 = fbm(u * 14 + 8, v * 8 + 3);
      const band = 0.08 * Math.cos((lat * Math.PI) / 45);
      const albedo = Math.min(1, Math.max(0, 0.42 + 0.38 * n + 0.16 * n2 + band));

      let r = 132 + 98 * albedo;
      let g = 48 + 38 * albedo;
      let b = 28 + 16 * albedo;

      if (lat > 90 - northCap || lat < -90 + southCap) {
        const cap = lat > 0 ? (lat - (90 - northCap)) / northCap : (-90 + southCap - lat) / southCap;
        const t = Math.min(1, Math.max(0, cap));
        r = r * (1 - t) + 228 * t;
        g = g * (1 - t) + 220 * t;
        b = b * (1 - t) + 208 * t;
      }

      const i = (y * w + x) * 4;
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}
