import { rad } from "./math";

export type ChartXY = { x: number; y: number };

/**
 * Azimuthal equidistant whole-sky disc, looking up from Jezero.
 * Center = zenith, rim = horizon. North is up; east is left (sky, not map).
 * Unit circle: r = (90° − alt) / 90°.
 */
export function projectHorizon(azDeg: number, altDeg: number): ChartXY {
  const r = (90 - altDeg) / 90;
  const az = rad(azDeg);
  return {
    x: -r * Math.sin(az),
    y: r * Math.cos(az),
  };
}

/** ENU-like Three.js dir (+x east, +y up, +z south) → azimuth / altitude. */
export function dirToHorizon(dir: { x: number; y: number; z: number }): {
  az: number;
  alt: number;
} {
  const east = dir.x;
  const up = dir.y;
  const north = -dir.z;
  const horiz = Math.hypot(east, north);
  return {
    az: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360,
    alt: (Math.atan2(up, horiz) * 180) / Math.PI,
  };
}

export function clipSegmentToUnitCircle(
  a: ChartXY,
  b: ChartXY,
): [ChartXY, ChartXY] | null {
  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;
  const ra2 = ax * ax + ay * ay;
  const rb2 = bx * bx + by * by;
  if (ra2 <= 1 && rb2 <= 1) return [a, b];

  const dx = bx - ax;
  const dy = by - ay;
  const A = dx * dx + dy * dy;
  if (A < 1e-16) return ra2 <= 1 ? [a, b] : null;

  const B = 2 * (ax * dx + ay * dy);
  const C = ra2 - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;

  const s = Math.sqrt(disc);
  const t1 = (-B - s) / (2 * A);
  const t2 = (-B + s) / (2 * A);
  const hits: number[] = [];
  for (const t of [t1, t2]) {
    if (t >= -1e-6 && t <= 1 + 1e-6) hits.push(Math.min(1, Math.max(0, t)));
  }
  if (hits.length === 2 && Math.abs(hits[0]! - hits[1]!) < 1e-9) hits.pop();

  const at = (t: number): ChartXY => ({ x: ax + t * dx, y: ay + t * dy });

  if (ra2 <= 1 && rb2 > 1) {
    const t = hits.find((v) => v > 1e-6) ?? 1;
    return [a, at(t)];
  }
  if (rb2 <= 1 && ra2 > 1) {
    const t = [...hits].reverse().find((v) => v < 1 - 1e-6) ?? 0;
    return [at(t), b];
  }
  if (hits.length >= 2) return [at(hits[0]!), at(hits[1]!)];
  return null;
}

export function starRadius(mag: number, chartR: number): number {
  const scale = chartR / 480;
  const t = Math.max(0, 6.6 - mag);
  return Math.max(0.38 * scale, (0.2 * t + 0.055 * t * t) * scale);
}
