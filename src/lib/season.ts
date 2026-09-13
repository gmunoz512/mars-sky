import { wrap360 } from "./math";

/**
 * Mars areocentric solar longitude Ls (Allison & McEwen 2000 / NASA Mars24).
 * ΔtJd is TT days from J2000.0 (JD 2451545.0).
 * Good to ~0.01° — used here only as a seasonal label.
 */
export function marsSolarLongitude(jdTt: number): number {
  const d = jdTt - 2451545.0;
  const M = (19.387 + 0.52402075 * d) * (Math.PI / 180);
  const alphaFms = 270.3863 + 0.5240384 * d;
  const pbs =
    0.0071 * Math.sin(((0.985626 * d + 28.73) * Math.PI) / 180) +
    0.0059 * Math.sin(((0.49261 * d + 3.69) * Math.PI) / 180) +
    0.004 * Math.sin(((1.9772 * d + 248.23) * Math.PI) / 180) +
    0.0038 * Math.sin(((7.8599 * d + 157.97) * Math.PI) / 180) +
    0.0026 * Math.sin(((5.4006 * d + 273.81) * Math.PI) / 180) +
    0.0021 * Math.sin(((0.985626 * d * 2 + 57.46) * Math.PI) / 180) +
    0.002 * Math.sin(((2.1353 * d + 145.54) * Math.PI) / 180);
  const vMinusM =
    (10.691 + 3.0e-7 * d) * Math.sin(M) +
    0.623 * Math.sin(2 * M) +
    0.05 * Math.sin(3 * M) +
    0.005 * Math.sin(4 * M) +
    0.0005 * Math.sin(5 * M);
  return wrap360(alphaFms + pbs + vMinusM);
}

export function jezeroSeason(ls: number): string {
  if (ls < 30) return "early northern spring";
  if (ls < 60) return "mid northern spring";
  if (ls < 90) return "late northern spring";
  if (ls < 120) return "early northern summer";
  if (ls < 150) return "mid northern summer";
  if (ls < 180) return "late northern summer";
  if (ls < 210) return "early northern autumn";
  if (ls < 240) return "mid northern autumn";
  if (ls < 270) return "late northern autumn";
  if (ls < 300) return "early northern winter";
  if (ls < 330) return "mid northern winter";
  return "late northern winter";
}
