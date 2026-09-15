import { JEZERO } from "./jezero";
import { localTrueSolarTimeHours } from "./midnight";

/** Mean solar day on Mars (Earth days). NASA Mars24 / Allison & McEwen 2000. */
const MARS_SOL_DAYS = 1.0274912517;
/** MSD at J2000-adjacent epoch in the Mars24 formula. */
const MSD_OFFSET = 44796.0 - 0.0009626;
/** astronomy-engine `AstroTime.tt` is days from J2000.0, not a Julian Date. */
const J2000_JD = 2451545.0;
const MSD_JD_EPOCH = 2451549.5;

/**
 * Perseverance Sol 0 in the Jezero mission time zone (Wikipedia / Mars24:
 * Sol 0 = MSD 52304 at the planned 77.43°E clock).
 */
const M20_SOL0_MSD = 52304;
const M20_LON_EAST = 77.43;

export type JezeroClock = {
  msd: number;
  ltstHours: number;
  lmstHours: number;
  ltst: string;
  lmst: string;
  /** Mission sol at Jezero; null before Perseverance Sol 0. */
  perseveranceSol: number | null;
  /** Short HUD label: "Sol 1847" or "MSD 44796". */
  solLabel: string;
};

/**
 * Mars Sol Date from astronomy-engine Terrestrial Time
 * (days since J2000.0). NASA Mars24 C-2.
 */
export function marsSolDate(ttJ2000: number): number {
  const jdTt = ttJ2000 + J2000_JD;
  return (jdTt - MSD_JD_EPOCH) / MARS_SOL_DAYS + MSD_OFFSET;
}

export function airyMeanTimeHours(msd: number): number {
  const frac = msd - Math.floor(msd);
  return (frac < 0 ? frac + 1 : frac) * 24;
}

/** LMST at an east-positive areocentric longitude. */
export function localMeanSolarTimeHours(
  msd: number,
  lonEastDeg = JEZERO.longitudeEastDeg,
): number {
  const hours = airyMeanTimeHours(msd) + lonEastDeg / 15;
  return ((hours % 24) + 24) % 24;
}

export function perseveranceSol(msd: number): number {
  const local = msd + M20_LON_EAST / 360;
  return Math.floor(local) - M20_SOL0_MSD;
}

export function formatMarsClock(hours: number): string {
  const wrapped = ((hours % 24) + 24) % 24;
  let totalMin = Math.round(wrapped * 60);
  if (totalMin >= 24 * 60) totalMin = 0;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function jezeroClock(ttJ2000: number, utc: Date): JezeroClock {
  const msd = marsSolDate(ttJ2000);
  const ltstHours = localTrueSolarTimeHours(utc);
  const lmstHours = localMeanSolarTimeHours(msd);
  const sol = perseveranceSol(msd);
  return {
    msd,
    ltstHours,
    lmstHours,
    ltst: formatMarsClock(ltstHours),
    lmst: formatMarsClock(lmstHours),
    perseveranceSol: sol >= 0 ? sol : null,
    solLabel: sol >= 0 ? `Sol ${sol}` : `MSD ${Math.floor(msd)}`,
  };
}
