/**
 * Photographic Jezero surface for the zoomed-in view.
 *
 * Albedo comes from Perseverance Mastcam-Z public-domain mosaic PIA24663
 * (Van Zyl Overlook, April 2021). Credit: NASA/JPL-Caltech/ASU/MSSS.
 * https://photojournal.jpl.nasa.gov/catalog/PIA24663
 *
 * This is a textured ground disc + a 360° horizon cylinder, not a HiRISE
 * DEM or a photogrammetric stitch. The photos are daylight; the sky
 * above is the computed local true solar midnight.
 */
import * as THREE from "three";

export const TERRAIN_SOURCES = {
  pia: "PIA24663",
  title: "Mastcam-Z 360-degree View of Van Zyl Overlook",
  credit: "NASA/JPL-Caltech/ASU/MSSS",
  url: "https://photojournal.jpl.nasa.gov/catalog/PIA24663",
} as const;

export const GROUND_RADIUS = 5.4;
export const HORIZON_RADIUS = 11;
export const HORIZON_HEIGHT = 3.55;
/** World y of the texture horizon line (matches camera eye height). */
export const HORIZON_EYE_Y = 0.2;

/** Gentle yard ripples only — the photograph carries the landscape. */
export function sampleGroundHeight(x: number, z: number): number {
  const r2 = x * x + z * z;
  return 0.012 * Math.sin(x * 2.1 + z * 1.4) * Math.exp(-r2 / 28);
}

export function buildPhotoGroundGeometry(): THREE.BufferGeometry {
  const segs = 72;
  const verts = segs + 1;
  const positions = new Float32Array((verts + 1) * 3);
  const uvs = new Float32Array((verts + 1) * 2);
  positions[0] = 0;
  positions[1] = sampleGroundHeight(0, 0);
  positions[2] = 0;
  uvs[0] = 0.5;
  uvs[1] = 0.5;
  for (let i = 0; i < verts; i += 1) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * GROUND_RADIUS;
    const z = Math.sin(a) * GROUND_RADIUS;
    positions[(i + 1) * 3] = x;
    positions[(i + 1) * 3 + 1] = sampleGroundHeight(x, z);
    positions[(i + 1) * 3 + 2] = z;
    uvs[(i + 1) * 2] = 0.5 + 0.5 * (x / GROUND_RADIUS);
    uvs[(i + 1) * 2 + 1] = 0.5 + 0.5 * (z / GROUND_RADIUS);
  }
  const indices: number[] = [];
  for (let i = 1; i <= segs; i += 1) {
    indices.push(0, i === segs ? 1 : i + 1, i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
