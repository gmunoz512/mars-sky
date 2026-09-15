import { JEZERO } from "./jezero";
import type { Vec3 } from "./math";
import { KM_PER_AU, normalize, rad } from "./math";

/** Jezero as a unit vector in Mars body-fixed (IAU +X Airy-0, +Z north). */
export function jezeroUnitFixed(): Vec3 {
  return latLonUnitFixed(JEZERO.latitudeDeg, JEZERO.longitudeEastDeg);
}

/** Melas / Coprates — the canyon scar on a classic Mars portrait. */
export const VALLES_MARINERIS = { latitudeDeg: -13.9, longitudeEastDeg: -59.2 };

/** Frame Valles Marineris plus Tharsis, as in a Viking-era globe. */
export const PORTRAIT_FACE = { latitudeDeg: -8.0, longitudeEastDeg: -78.0 };

export function vallesMarinerisUnitFixed(): Vec3 {
  return latLonUnitFixed(VALLES_MARINERIS.latitudeDeg, VALLES_MARINERIS.longitudeEastDeg);
}

export function portraitFaceUnitFixed(): Vec3 {
  return latLonUnitFixed(PORTRAIT_FACE.latitudeDeg, PORTRAIT_FACE.longitudeEastDeg);
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

/**
 * Fraction of the *shorter* viewport axis the globe should fill.
 * Small enough that a phone still shows a complete sphere in black space.
 * 0.506 is ~15% larger than the original 0.44 framing.
 */
export const ORBIT_FILL = 0.506;
export const ORBIT_FOV_DEG = 36;
/**
 * Compressed scene radii (Mars = 1) for Sun/planets in the orbit sky.
 * Beyond a phone-portrait camera (~13) so they read as background objects,
 * with log(AU) spacing so closer worlds sit inward of farther ones.
 */
export const ORBIT_SKY_NEAR = 18;
export const ORBIT_SKY_FAR = 40;
export const ORBIT_SKY_AU_MIN = 0.28;
export const ORBIT_SKY_AU_MAX = 12;
/** Phobos/Deimos shells, in Mars radii — close enough to pass near the globe. */
export const ORBIT_MOON_NEAR = 2.35;
export const ORBIT_MOON_FAR = 5.5;
/** How far the camera can pitch off the equator before it locks (radians). */
export const ORBIT_PITCH_MAX = 1.2;

export function clampOrbitPitch(pitch: number, max = ORBIT_PITCH_MAX): number {
  return Math.min(max, Math.max(-max, pitch));
}

/** Unit camera direction. az=0, el=0 looks from +Z; +el is north. */
export function orbitCameraDir(az: number, el: number): Vec3 {
  const c = Math.cos(el);
  return {
    x: Math.sin(az) * c,
    y: Math.sin(el),
    z: Math.cos(az) * c,
  };
}

/** Narrower of vertical FOV and the derived horizontal FOV, in degrees. */
export function narrowerFovDeg(aspect: number, verticalFovDeg: number): number {
  const v = (verticalFovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * Math.max(aspect, 0.05));
  return (Math.min(v, h) * 180) / Math.PI;
}

/** Apparent angular diameter of a sphere of `radius` at `distance`, in degrees. */
export function sphereAngularDiameterDeg(distance: number, radius = 1): number {
  const d = Math.max(distance, radius + 1e-4);
  return (2 * Math.asin(Math.min(1, radius / d)) * 180) / Math.PI;
}

/**
 * Camera distance that frames a unit Mars as a full globe with black space
 * around it. Fits the shorter viewport axis so a phone portrait cannot
 * crop the planet into a surface close-up.
 */
export function orbitCameraDistance(
  aspect: number,
  verticalFovDeg: number = ORBIT_FOV_DEG,
  opts?: { radius?: number; fill?: number },
): number {
  const radius = opts?.radius ?? 1;
  const fill = opts?.fill ?? ORBIT_FILL;
  const vHalf = Math.tan(((verticalFovDeg * Math.PI) / 180) / 2);
  const hHalf = vHalf * Math.max(aspect, 0.05);
  const minHalf = Math.min(vHalf, hHalf);
  const ang = Math.atan(minHalf * fill);
  return radius / Math.sin(Math.max(ang, 0.02));
}

/** True when the segment from `origin` to `target` hits a sphere at the origin first. */
export function rayHitsSphereBefore(origin: Vec3, target: Vec3, radius: number): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dz = target.z - origin.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return false;
  const inv = 1 / len;
  const dirx = dx * inv;
  const diry = dy * inv;
  const dirz = dz * inv;
  const b = origin.x * dirx + origin.y * diry + origin.z * dirz;
  const c = origin.x * origin.x + origin.y * origin.y + origin.z * origin.z - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return false;
  const t = -b - Math.sqrt(Math.max(0, disc));
  return t > 1e-4 && t < len - 1e-4;
}

export type OrbitSkyKind = "sun" | "planet" | "earth" | "satellite";

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/**
 * Readable scene distance for a Mars-centered body. Directions stay honest;
 * AU (or moon km) are log-compressed onto shells so distant worlds stay in view.
 */
export function orbitSkyDistance(distAu: number, kind: OrbitSkyKind): number {
  if (kind === "satellite") {
    const r = (distAu * KM_PER_AU) / JEZERO.marsRadiusKm;
    const t = clamp01(
      Math.log(Math.max(r, 2.2) / 2.2) / Math.log(7.2 / 2.2),
    );
    return ORBIT_MOON_NEAR + (ORBIT_MOON_FAR - ORBIT_MOON_NEAR) * t;
  }
  const t = clamp01(
    Math.log(Math.max(distAu, ORBIT_SKY_AU_MIN) / ORBIT_SKY_AU_MIN) /
      Math.log(ORBIT_SKY_AU_MAX / ORBIT_SKY_AU_MIN),
  );
  return ORBIT_SKY_NEAR + (ORBIT_SKY_FAR - ORBIT_SKY_NEAR) * t;
}

/** Body-fixed direction placed on the compressed orbit-sky shell (Three.js axes). */
export function orbitSkyPosition(fixed: Vec3, distAu: number, kind: OrbitSkyKind): Vec3 {
  const dir = normalize(bodyFixedToThree(fixed));
  const r = orbitSkyDistance(distAu, kind);
  return { x: dir.x * r, y: dir.y * r, z: dir.z * r };
}

/** True when Mars sits between the camera and a sky body. */
export function orbitBodyOccluded(
  camera: Vec3,
  body: Vec3,
  globeRadius = 1.02,
): boolean {
  return rayHitsSphereBefore(camera, body, globeRadius);
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
