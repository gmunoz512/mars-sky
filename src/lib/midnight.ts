import { Body, HelioVector, MakeTime } from "astronomy-engine";
import { JEZERO } from "./jezero";
import { marsBodyFixedFromEqj } from "./marsFrame";
import { wrap180 } from "./math";

function subsolarEastLongitude(date: Date): number {
  const time = MakeTime(date);
  const mars = HelioVector(Body.Mars, time);
  const sunEqj = { x: -mars.x, y: -mars.y, z: -mars.z };
  const { eqjToFixed } = marsBodyFixedFromEqj(time);
  const f = {
    x: eqjToFixed[0] * sunEqj.x + eqjToFixed[1] * sunEqj.y + eqjToFixed[2] * sunEqj.z,
    y: eqjToFixed[3] * sunEqj.x + eqjToFixed[4] * sunEqj.y + eqjToFixed[5] * sunEqj.z,
    z: eqjToFixed[6] * sunEqj.x + eqjToFixed[7] * sunEqj.y + eqjToFixed[8] * sunEqj.z,
  };
  return (Math.atan2(f.y, f.x) * 180) / Math.PI;
}

/** Residual from local true solar midnight: 0 when the Sun is at HA = 180°. */
export function midnightResidualDeg(date: Date): number {
  const sunLon = subsolarEastLongitude(date);
  return wrap180(sunLon - JEZERO.longitudeEastDeg - 180);
}

function refineCrossing(lo: number, hi: number): number {
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const r = midnightResidualDeg(new Date(mid));
    const rl = midnightResidualDeg(new Date(lo));
    if ((rl > 0 && r > 0) || (rl < 0 && r < 0)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * UTC instant of Jezero local true solar midnight nearest 12:00 UTC
 * on the given Earth civil date. One Mars sol is 24h 39m 35s, so each
 * Earth date has one such midnight.
 */
export function findJezeroMidnight(year: number, month: number, day: number): Date {
  const noon = Date.UTC(year, month - 1, day, 12, 0, 0);
  const start = noon - 18 * 3600 * 1000;
  const end = noon + 18 * 3600 * 1000;
  const stepMs = 10 * 60 * 1000;
  const zeros: number[] = [];
  let prevT = start;
  let prevR = midnightResidualDeg(new Date(start));
  for (let t = start + stepMs; t <= end; t += stepMs) {
    const r = midnightResidualDeg(new Date(t));
    // Residual is near 0 at midnight and ~±180° at noon. Ignore noon wraps.
    if (Math.abs(prevR) < 90 && Math.abs(r) < 90 && Math.sign(prevR) !== Math.sign(r)) {
      zeros.push(refineCrossing(prevT, t));
    }
    prevT = t;
    prevR = r;
  }
  if (zeros.length === 0) {
    return new Date(noon);
  }
  zeros.sort((a, b) => Math.abs(a - noon) - Math.abs(b - noon));
  return new Date(zeros[0]!);
}
