export type Vec3 = { x: number; y: number; z: number };

/** Row-major 3×3 matrix. */
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function rad(deg: number): number {
  return deg * DEG;
}

export function deg(radians: number): number {
  return radians * RAD;
}

export function wrap360(degValue: number): number {
  const x = degValue % 360;
  return x < 0 ? x + 360 : x;
}

export function wrap180(degValue: number): number {
  const x = wrap360(degValue);
  return x > 180 ? x - 360 : x;
}

export function hypot3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalize(v: Vec3): Vec3 {
  const n = hypot3(v);
  if (n === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** IAU R3(χ): rotation of column vectors around +Z. */
export function iauR3(chiDeg: number): Mat3 {
  const c = Math.cos(rad(chiDeg));
  const s = Math.sin(rad(chiDeg));
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/** IAU R1(χ): rotation of column vectors around +X. */
export function iauR1(chiDeg: number): Mat3 {
  const c = Math.cos(rad(chiDeg));
  const s = Math.sin(rad(chiDeg));
  return [1, 0, 0, 0, c, s, 0, -s, c];
}

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r.push(a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!);
    }
  }
  return r as Mat3;
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  };
}

export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function raDecToEqj(raDeg: number, decDeg: number): Vec3 {
  const ra = rad(raDeg);
  const dec = rad(decDeg);
  const c = Math.cos(dec);
  return { x: c * Math.cos(ra), y: c * Math.sin(ra), z: Math.sin(dec) };
}
