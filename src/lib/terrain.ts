/**
 * Jezero-inspired surface terrain for the zoomed-in view.
 *
 * This is **not** a photogrammetric mesh. Heights are a schematic crater
 * bowl with a broken western rim (Neretva / western-delta stand-in) and
 * dusty floor buttes. Vertex colors follow the ochre–rust palette of
 * NASA/JPL-Caltech/ASU Perseverance Mastcam-Z and Navcam public-domain
 * photographs of Jezero (e.g. PIA24487, first color view from the surface).
 *
 * Sources of truth for *place*: 18.4446°N, 77.4509°E (Perseverance site).
 * Do not treat the mesh as HiRISE, MOLA, or a rover panorama stitch.
 */
import * as THREE from "three";

export const TERRAIN_RADIUS = 26;
export const TERRAIN_SEGMENTS = 148;
/** Typical rim ring distance from the local origin (schematic crater). */
export const RIM_RADIUS = 9.4;

function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, z: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 0.35;
  for (let i = 0; i < 5; i += 1) {
    sum += amp * (valueNoise(x * freq, z * freq) * 2 - 1);
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Height (Three.js y, local metres-ish) at a ground point.
 * +x ≈ east, +z ≈ south so the western rim sits at negative x.
 */
export function sampleJezeroHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const az = Math.atan2(z, x);

  let h = -0.06;
  h += 0.05 * smoothstep(12, 22, r);

  const rim = Math.exp(-((r - RIM_RADIUS) ** 2) / (2 * 1.15 ** 2));
  // Western gap: Neretva Vallis / delta inlet — rim is broken, not a full ring.
  const west = Math.exp(-((az - Math.PI) ** 2) / 0.42);
  h += rim * 2.15 * (1 - 0.78 * west);

  // Western delta fan inside the bowl (raised, sloped toward the floor).
  const dx = x + 5.4;
  const dz = z + 0.6;
  const fan = Math.exp(-(dx * dx) / 9 - (dz * dz) / 16);
  if (r < RIM_RADIUS + 0.4) {
    h += 0.42 * fan * (1 - r / (RIM_RADIUS + 1.2));
  }

  // Floor buttes / rocky islands (Kodiak-like stand-ins, not named outcrops).
  h += 0.2 * Math.exp(-((x - 1.4) ** 2 + (z + 2.6) ** 2) / 2.4);
  h += 0.14 * Math.exp(-((x + 2.1) ** 2 + (z - 3.0) ** 2) / 1.9);
  h += 0.1 * Math.exp(-((x - 3.2) ** 2 + (z - 1.1) ** 2) / 1.4);

  // Far eastern highlands beyond the rim.
  h += 0.38 * smoothstep(13, 17, r) * (0.45 + 0.55 * Math.cos(az)) * (1 - smoothstep(20, 25, r));

  h += fbm(x, z) * 0.09;
  // Yard-scale ripples so the floor underfoot is not a billiard table.
  h += fbm(x * 2.6, z * 2.6) * 0.05 * Math.exp(-(r * r) / 40);
  return h;
}

function terrainColor(x: number, z: number, h: number, slope: number): THREE.Color {
  const r = Math.hypot(x, z);
  const dust = new THREE.Color(0xe8a86c);
  const ochre = new THREE.Color(0xd48448);
  const rock = new THREE.Color(0xb05a36);
  const shadow = new THREE.Color(0x8a4a30);
  const bright = new THREE.Color(0xf2c090);
  const color = ochre.clone();

  color.lerp(dust, smoothstep(-0.05, 0.2, h) * 0.55);
  color.lerp(rock, Math.min(1, slope * 2.1));
  if (r > RIM_RADIUS - 0.6 && r < RIM_RADIUS + 1.4) {
    color.lerp(rock, 0.28);
  }
  if (h < -0.02 && r < 7) {
    color.lerp(dust, 0.45);
  }
  color.lerp(shadow, Math.min(0.28, slope * 0.85));
  color.lerp(bright, Math.max(0, 0.14 - slope) * 0.45);
  const speck = hash2(Math.floor(x * 9), Math.floor(z * 9));
  color.offsetHSL(0, 0, (speck - 0.5) * 0.06);
  return color;
}

/** Build a vertex-colored mesh of the schematic Jezero bowl. */
export function buildJezeroTerrainGeometry(): THREE.BufferGeometry {
  const segs = TERRAIN_SEGMENTS;
  const half = TERRAIN_RADIUS;
  const step = (half * 2) / segs;
  const verts = (segs + 1) * (segs + 1);
  const positions = new Float32Array(verts * 3);
  const colors = new Float32Array(verts * 3);
  const uvs = new Float32Array(verts * 2);
  const heights = new Float32Array(verts);

  let i = 0;
  for (let iz = 0; iz <= segs; iz += 1) {
    for (let ix = 0; ix <= segs; ix += 1) {
      const x = -half + ix * step;
      const z = -half + iz * step;
      const y = sampleJezeroHeight(x, z);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      uvs[i * 2] = (ix / segs) * 10;
      uvs[i * 2 + 1] = (iz / segs) * 10;
      heights[i] = y;
      i += 1;
    }
  }

  i = 0;
  for (let iz = 0; iz <= segs; iz += 1) {
    for (let ix = 0; ix <= segs; ix += 1) {
      const x = -half + ix * step;
      const z = -half + iz * step;
      const left = ix > 0 ? heights[i - 1] : heights[i];
      const right = ix < segs ? heights[i + 1] : heights[i];
      const down = iz > 0 ? heights[i - (segs + 1)] : heights[i];
      const up = iz < segs ? heights[i + (segs + 1)] : heights[i];
      const slope = Math.min(1, Math.hypot(right - left, up - down) / (step * 2.4));
      const c = terrainColor(x, z, heights[i], slope);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      i += 1;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < segs; iz += 1) {
    for (let ix = 0; ix < segs; ix += 1) {
      const a = iz * (segs + 1) + ix;
      const b = a + 1;
      const c = a + (segs + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Nearby floor stones so the yard is not an empty disc. */
export const FLOOR_BOULDERS: { x: number; z: number; r: number }[] = [
  { x: 3.2, z: -1.8, r: 0.22 },
  { x: -0.6, z: 2.4, r: 0.16 },
  { x: 2.8, z: 1.9, r: 0.13 },
  { x: -2.4, z: -0.8, r: 0.19 },
  { x: 0.4, z: -3.1, r: 0.15 },
  { x: 4.6, z: 0.6, r: 0.2 },
  { x: -1.8, z: -2.6, r: 0.12 },
  { x: 5.1, z: -2.2, r: 0.17 },
];

/**
 * Tiled grit overlay (browser only). Variation only — hue comes from
 * vertex colors keyed to Perseverance public-domain stills.
 */
export function buildGritTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 0.78 + Math.random() * 0.22;
    img.data[i] = Math.floor(232 * n);
    img.data[i + 1] = Math.floor(168 * n);
    img.data[i + 2] = Math.floor(112 * n);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 140; i += 1) {
    const shade = 120 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgba(${shade},${Math.floor(shade * 0.55)},${Math.floor(shade * 0.32)},0.35)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
