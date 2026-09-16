import { JEZERO } from "./jezero";
import type { Vec3 } from "./math";
import { KM_PER_AU, dot, normalize, rad } from "./math";

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

/**
 * Apparent angular size vs camera distance. Large enough that NASA maps
 * read as miniature globes; still much smaller than Mars in the frame.
 */
const ORBIT_BODY_ANG: Record<string, number> = {
  sun: 0.028,
  jupiter: 0.024,
  saturn: 0.017,
  earth: 0.019,
  venus: 0.0165,
  mercury: 0.013,
  phobos: 0.0054,
  deimos: 0.0046,
};

export function orbitBodyAngularSize(kind: OrbitSkyKind, distAu: number, id?: string): number {
  if (id && ORBIT_BODY_ANG[id] != null) {
    if (kind === "planet" && (id === "mercury" || id === "venus")) {
      const r = orbitSkyDistance(distAu, kind);
      const t = clamp01((r - ORBIT_SKY_NEAR) / (ORBIT_SKY_FAR - ORBIT_SKY_NEAR));
      return ORBIT_BODY_ANG[id]! * (1 - 0.18 * t);
    }
    return ORBIT_BODY_ANG[id]!;
  }
  if (kind === "satellite") return 0.0048;
  if (kind === "sun") return 0.028;
  if (kind === "earth") return 0.019;
  const r = orbitSkyDistance(distAu, kind);
  const t = clamp01((r - ORBIT_SKY_NEAR) / (ORBIT_SKY_FAR - ORBIT_SKY_NEAR));
  return 0.015 - 0.0055 * t;
}

/** Saturn ring radii in units of the globe mesh (sphere radius 1). */
export const SATURN_RING_INNER = 1.11;
export const SATURN_RING_OUTER = 2.32;

/** Radial U for a ring strip texture (u = 0 at inner edge). */
export function saturnRingRadialUv(
  x: number,
  y: number,
  inner = SATURN_RING_INNER,
  outer = SATURN_RING_OUTER,
): number {
  return clamp01((Math.hypot(x, y) - inner) / (outer - inner));
}

export type Quat = { x: number; y: number; z: number; w: number };

/** Unit quaternion rotating `from` onto `to`. */
export function quatFromTo(from: Vec3, to: Vec3): Quat {
  const a = normalize(from);
  const b = normalize(to);
  const d = dot(a, b);
  if (d >= 0.999999) return { x: 0, y: 0, z: 0, w: 1 };
  if (d <= -0.999999) {
    const ortho = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const c = normalize({
      x: a.y * ortho.z - a.z * ortho.y,
      y: a.z * ortho.x - a.x * ortho.z,
      z: a.x * ortho.y - a.y * ortho.x,
    });
    return { x: c.x, y: c.y, z: c.z, w: 0 };
  }
  const cx = a.y * b.z - a.z * b.y;
  const cy = a.z * b.x - a.x * b.z;
  const cz = a.x * b.y - a.y * b.x;
  const w = 1 + d;
  const n = Math.hypot(cx, cy, cz, w) || 1;
  return { x: cx / n, y: cy / n, z: cz / n, w: w / n };
}

/** Align mesh +Y (Three.js sphere north) with a body-fixed pole already in Three.js axes. */
export function quatAlignYTo(poleThree: Vec3): Quat {
  return quatFromTo({ x: 0, y: 1, z: 0 }, poleThree);
}

export function rotateByQuat(q: Quat, v: Vec3): Vec3 {
  const ux = q.x;
  const uy = q.y;
  const uz = q.z;
  const tx = 2 * (uy * v.z - uz * v.y);
  const ty = 2 * (uz * v.x - ux * v.z);
  const tz = 2 * (ux * v.y - uy * v.x);
  return {
    x: v.x + q.w * tx + (uy * tz - uz * ty),
    y: v.y + q.w * ty + (uz * tx - ux * tz),
    z: v.z + q.w * tz + (ux * ty - uy * tx),
  };
}

export type OrbitBodyLook = {
  roughness: number;
  metalness: number;
  emissive: number;
  unlit: boolean;
  rings: boolean;
  atmos: "earth" | "venus" | "sun" | null;
};

export function orbitBodyLook(id: string, kind: OrbitSkyKind): OrbitBodyLook {
  if (kind === "sun" || id === "sun") {
    return { roughness: 1, metalness: 0, emissive: 1, unlit: true, rings: false, atmos: "sun" };
  }
  if (id === "earth") {
    return { roughness: 0.52, metalness: 0.06, emissive: 0.16, unlit: false, rings: false, atmos: "earth" };
  }
  if (id === "venus") {
    return { roughness: 0.72, metalness: 0.02, emissive: 0.14, unlit: false, rings: false, atmos: "venus" };
  }
  if (id === "jupiter") {
    return { roughness: 0.78, metalness: 0.02, emissive: 0.14, unlit: false, rings: false, atmos: null };
  }
  if (id === "saturn") {
    return { roughness: 0.8, metalness: 0.03, emissive: 0.14, unlit: false, rings: true, atmos: null };
  }
  if (kind === "satellite") {
    return { roughness: 0.95, metalness: 0, emissive: 0.1, unlit: false, rings: false, atmos: null };
  }
  return { roughness: 0.88, metalness: 0.02, emissive: 0.12, unlit: false, rings: false, atmos: null };
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

export const PLANET_CREDIT = "NASA / USGS / Solar System Scope";

export const PLANET_SOURCES = [
  {
    id: "sun",
    title: "Solar photosphere wrap (NASA-based)",
    url: "https://www.solarsystemscope.com/textures/",
    credit: "Solar System Scope (CC BY 4.0)",
    role: "orbit-sky photosphere",
  },
  {
    id: "mercury",
    title: "MESSENGER MDIS global mosaic",
    url: "https://commons.wikimedia.org/wiki/File:Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_32ppd.jpg",
    credit: "NASA/JHUAPL/Carnegie",
    role: "orbit-sky albedo",
  },
  {
    id: "venus",
    title: "Magellan cylindrical radar map",
    url: "https://commons.wikimedia.org/wiki/File:Cylindrical_Map_of_Venus.jpg",
    credit: "NASA/JPL",
    role: "orbit-sky albedo",
  },
  {
    id: "earth",
    title: "NASA Blue Marble + cloud layer",
    url: "https://visibleearth.nasa.gov/images/57752/blue-marble-next-generation",
    credit: "NASA GSFC",
    role: "orbit-sky albedo",
  },
  {
    id: "jupiter",
    title: "Cassini cylindrical map (PIA07782)",
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA07782",
    credit: "NASA/JPL/SSI",
    role: "orbit-sky albedo",
  },
  {
    id: "saturn",
    title: "Saturn globe + ring strip (NASA-based)",
    url: "https://www.solarsystemscope.com/textures/",
    credit: "Solar System Scope (CC BY 4.0)",
    role: "orbit-sky albedo and rings",
  },
  {
    id: "phobos",
    title: "Phobos Viking mosaic (DLR control)",
    url: "https://commons.wikimedia.org/wiki/File:Phobos_Viking_Mosaic_DLRcontrol_7200.jpg",
    credit: "NASA/JPL / PDS / Phil Stooke",
    role: "orbit-sky albedo (Deimos toned from the same mosaic)",
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
