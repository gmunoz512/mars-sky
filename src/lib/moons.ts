import type { Vec3 } from "./math";
import { rad } from "./math";

/**
 * Phobos & Deimos mean precessing ellipses referred to each satellite's
 * local Laplace plane.
 *
 * Elements: Jacobson (2010), AJ 139, 668, Table 6 — epoch 1950 Jan 1.0 TDT
 * (JD 2433282.5), planetocentric, Laplace-plane frame. Mean motions and
 * secular node/periapsis rates are from that table.
 *
 * Phobos tidal acceleration: Brozović, Jacobson & Park (2025), AJ,
 * ½ṅ = 1.258×10⁻³ deg yr⁻², applied from the 1950 epoch. Mixing the 2025
 * acceleration with 2010 mean elements is an approximation.
 *
 * This is not JPL MAR099 / Horizons. Expected along-track error is typically
 * a few degrees near the present, growing over decades (Phobos faster than
 * Deimos). Use it to place the moons in the correct region of sky, not for
 * transit or occultation timing.
 */
const EPOCH_JD = 2433282.5;
const DAYS_PER_YEAR = 365.25;

type MoonElements = {
  name: "Phobos" | "Deimos";
  aKm: number;
  e: number;
  iDeg: number;
  omegaBar0: number;
  lambda0: number;
  node0: number;
  nDegPerDay: number;
  dOmegaBar: number;
  dNode: number;
  /** Laplace pole RA/Dec in ICRF (degrees). */
  poleRa: number;
  poleDec: number;
  /** Mean-motion acceleration (deg/day²). */
  nDot: number;
};

const PHOBOS_HALF_N_DOT_DEG_YR2 = 1.258e-3;
const PHOBOS_N_DOT =
  (2 * PHOBOS_HALF_N_DOT_DEG_YR2) / (DAYS_PER_YEAR * DAYS_PER_YEAR);

const MOONS: MoonElements[] = [
  {
    name: "Phobos",
    aKm: 9375.0,
    e: 0.01511,
    iDeg: 1.0756,
    omegaBar0: 357.4308,
    lambda0: 90.9914,
    node0: 207.7875,
    nDegPerDay: 1128.844409,
    dOmegaBar: 0.4352,
    dNode: -0.4358,
    poleRa: 317.6708,
    poleDec: 52.893,
    nDot: PHOBOS_N_DOT,
  },
  {
    name: "Deimos",
    aKm: 23458.0,
    e: 0.00024,
    iDeg: 1.7878,
    omegaBar0: 290.7208,
    lambda0: 250.455,
    node0: 24.5123,
    nDegPerDay: 285.161886,
    dOmegaBar: 0.0179,
    dNode: -0.0181,
    poleRa: 316.657,
    poleDec: 53.5294,
    nDot: 0,
  },
];

function wrap360(x: number): number {
  const y = x % 360;
  return y < 0 ? y + 360 : y;
}

function eccentricAnomaly(Mdeg: number, e: number): number {
  let M = rad(wrap360(Mdeg));
  if (M > Math.PI) M -= 2 * Math.PI;
  let E = M;
  for (let i = 0; i < 12; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const d = f / fp;
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

function laplaceToEqj(x: number, y: number, z: number, poleRa: number, poleDec: number): Vec3 {
  const a = rad(poleRa);
  const d = rad(poleDec);
  const X = { x: -Math.sin(a), y: Math.cos(a), z: 0 };
  const Z = {
    x: Math.cos(d) * Math.cos(a),
    y: Math.cos(d) * Math.sin(a),
    z: Math.sin(d),
  };
  const Y = {
    x: -Math.sin(d) * Math.cos(a),
    y: -Math.sin(d) * Math.sin(a),
    z: Math.cos(d),
  };
  return {
    x: X.x * x + Y.x * y + Z.x * z,
    y: X.y * x + Y.y * y + Z.y * z,
    z: X.z * x + Y.z * y + Z.z * z,
  };
}

export type MoonState = {
  name: "Phobos" | "Deimos";
  /** Mars-centered EQJ position, km. */
  eqjKm: Vec3;
};

export function marsMoonsEqjKm(jdTt: number): MoonState[] {
  const dt = jdTt - EPOCH_JD;
  return MOONS.map((m) => {
    const lambda = m.lambda0 + m.nDegPerDay * dt + 0.5 * m.nDot * dt * dt;
    const omegaBar = m.omegaBar0 + m.dOmegaBar * dt;
    const node = m.node0 + m.dNode * dt;
    const argPeri = omegaBar - node;
    const meanAnom = lambda - omegaBar;
    const E = eccentricAnomaly(meanAnom, m.e);
    const xOrb = m.aKm * (Math.cos(E) - m.e);
    const yOrb = m.aKm * Math.sqrt(1 - m.e * m.e) * Math.sin(E);

    const w = rad(argPeri);
    const i = rad(m.iDeg);
    const om = rad(node);
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const x1 = xOrb * cw - yOrb * sw;
    const y1 = xOrb * sw + yOrb * cw;
    const ci = Math.cos(i);
    const si = Math.sin(i);
    const x2 = x1;
    const y2 = y1 * ci;
    const z2 = y1 * si;
    const co = Math.cos(om);
    const so = Math.sin(om);
    const x3 = x2 * co - y2 * so;
    const y3 = x2 * so + y2 * co;
    const z3 = z2;
    return {
      name: m.name,
      eqjKm: laplaceToEqj(x3, y3, z3, m.poleRa, m.poleDec),
    };
  });
}
