import {
  Body,
  HelioVector,
  MakeTime,
  type FlexibleDateTime,
} from "astronomy-engine";
import { CONSTELLATIONS, STARS } from "./catalog";
import {
  eqjToHorizon,
  horizonDirection,
  jezeroBodyFixedKm,
  marsBodyFixedFromEqj,
  type Horizon,
} from "./marsFrame";
import { type Vec3, hypot3, normalize, raDecToEqj } from "./math";
import { findJezeroMidnight } from "./midnight";
import { marsMoonsEqjKm } from "./moons";
import { jezeroSeason, marsSolarLongitude } from "./season";

export type CivilDate = { year: number; month: number; day: number };

export type SkyPoint = {
  dir: Vec3;
  az: number;
  alt: number;
};

export type SkyStar = SkyPoint & {
  mag: number;
  bv: number;
  name?: string;
};

export type SkyBody = SkyPoint & {
  id: string;
  name: string;
  kind: "sun" | "planet" | "earth" | "moon" | "satellite";
  color: string;
};

export type SkyLabel = SkyPoint & {
  text: string;
  kind: "constellation" | "star" | "body";
};

export type SkyModel = {
  utc: Date;
  jd: number;
  ls: number;
  season: string;
  stars: SkyStar[];
  lineSegments: number[];
  labels: SkyLabel[];
  bodies: SkyBody[];
  sun: SkyBody | null;
  /** Unit vector toward the Sun in Mars body-fixed (IAU +X Airy-0, +Z north). */
  sunFixed: Vec3;
};

const PLANETS: { body: Body; id: string; name: string; kind: SkyBody["kind"]; color: string }[] =
  [
    { body: Body.Sun, id: "sun", name: "Sun", kind: "sun", color: "#f4d59a" },
    { body: Body.Mercury, id: "mercury", name: "Mercury", kind: "planet", color: "#c9b59a" },
    { body: Body.Venus, id: "venus", name: "Venus", kind: "planet", color: "#efe3c4" },
    { body: Body.Earth, id: "earth", name: "Earth", kind: "earth", color: "#8ec6e6" },
    { body: Body.Moon, id: "moon", name: "Moon", kind: "moon", color: "#d8d2c6" },
    { body: Body.Jupiter, id: "jupiter", name: "Jupiter", kind: "planet", color: "#e0c197" },
    { body: Body.Saturn, id: "saturn", name: "Saturn", kind: "planet", color: "#e6d3a3" },
    { body: Body.Uranus, id: "uranus", name: "Uranus", kind: "planet", color: "#9fd4d0" },
    { body: Body.Neptune, id: "neptune", name: "Neptune", kind: "planet", color: "#7ea4d9" },
  ];

const C_AU_PER_DAY = 173.1446326742403;

function helio(body: Body, time: FlexibleDateTime): Vec3 {
  if (body === Body.Sun) return { x: 0, y: 0, z: 0 };
  const v = HelioVector(body, time);
  return { x: v.x, y: v.y, z: v.z };
}

/** One-iteration light-time from Mars to target. */
function marsCenteredEqjAu(body: Body, time: ReturnType<typeof MakeTime>): Vec3 {
  const mars0 = helio(Body.Mars, time);
  const target0 = helio(body, time);
  const dist = hypot3({
    x: target0.x - mars0.x,
    y: target0.y - mars0.y,
    z: target0.z - mars0.z,
  });
  const ltDays = dist / C_AU_PER_DAY;
  const earlier = time.AddDays(-ltDays);
  const mars = helio(Body.Mars, time);
  const target = helio(body, earlier);
  return {
    x: target.x - mars.x,
    y: target.y - mars.y,
    z: target.z - mars.z,
  };
}

function fromHorizon(h: Horizon): SkyPoint {
  return {
    dir: horizonDirection(h),
    az: h.azimuthDeg,
    alt: h.altitudeDeg,
  };
}

const ALT_MIN = -1.2;

export function computeSky(date: CivilDate): SkyModel {
  const utc = findJezeroMidnight(date.year, date.month, date.day);
  const time = MakeTime(utc);
  const frame = marsBodyFixedFromEqj(time);
  const observer = jezeroBodyFixedKm();
  const ls = marsSolarLongitude(time.tt);
  const sunEqj = marsCenteredEqjAu(Body.Sun, time);
  const sunFixed = normalize({
    x:
      frame.eqjToFixed[0] * sunEqj.x +
      frame.eqjToFixed[1] * sunEqj.y +
      frame.eqjToFixed[2] * sunEqj.z,
    y:
      frame.eqjToFixed[3] * sunEqj.x +
      frame.eqjToFixed[4] * sunEqj.y +
      frame.eqjToFixed[5] * sunEqj.z,
    z:
      frame.eqjToFixed[6] * sunEqj.x +
      frame.eqjToFixed[7] * sunEqj.y +
      frame.eqjToFixed[8] * sunEqj.z,
  });
  const stars: SkyStar[] = [];

  for (const star of STARS) {
    const eqj = raDecToEqj(star.ra, star.dec);
    const h = eqjToHorizon(eqj, frame.eqjToFixed);
    if (h.altitudeDeg < ALT_MIN) continue;
    stars.push({
      ...fromHorizon(h),
      mag: star.mag,
      bv: star.bv,
      name: star.name,
    });
  }

  const lineSegments: number[] = [];
  const labels: SkyLabel[] = [];

  for (const cons of CONSTELLATIONS) {
    const labH = eqjToHorizon(raDecToEqj(cons.ra, cons.dec), frame.eqjToFixed);
    if (labH.altitudeDeg > 8) {
      labels.push({
        ...fromHorizon(labH),
        text: cons.name,
        kind: "constellation",
      });
    }
    for (const seg of cons.lines) {
      let prev: Horizon | null = null;
      for (const [ra, dec] of seg) {
        const h = eqjToHorizon(raDecToEqj(ra, dec), frame.eqjToFixed);
        if (prev && prev.altitudeDeg > ALT_MIN && h.altitudeDeg > ALT_MIN) {
          const a = horizonDirection(prev);
          const b = horizonDirection(h);
          lineSegments.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
        prev = h;
      }
    }
  }

  for (const star of stars) {
    if (star.name && star.mag <= 1.65 && star.alt > 6) {
      labels.push({ ...star, text: star.name, kind: "star" });
    }
  }

  const bodies: SkyBody[] = [];
  let sun: SkyBody | null = null;

  for (const spec of PLANETS) {
    const eqjAu = marsCenteredEqjAu(spec.body, time);
    const h = eqjToHorizon(eqjAu, frame.eqjToFixed);
    if (h.altitudeDeg < 0 && spec.kind !== "sun") continue;
    const point = fromHorizon(h);
    const item: SkyBody = {
      ...point,
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      color: spec.color,
    };
    if (spec.kind === "sun") {
      sun = item;
      if (h.altitudeDeg >= 0) bodies.push(item);
    } else {
      bodies.push(item);
      if (h.altitudeDeg > 3) {
        labels.push({ ...point, text: spec.name, kind: "body" });
      }
    }
  }

  for (const moon of marsMoonsEqjKm(time.tt)) {
    const h = eqjToHorizon(moon.eqjKm, frame.eqjToFixed, observer);
    if (h.altitudeDeg < 0) continue;
    const point = fromHorizon(h);
    const item: SkyBody = {
      ...point,
      id: moon.name.toLowerCase(),
      name: moon.name,
      kind: "satellite",
      color: moon.name === "Phobos" ? "#d9b39a" : "#c8c2b6",
    };
    bodies.push(item);
    labels.push({ ...point, text: moon.name, kind: "body" });
  }

  return {
    utc,
    jd: time.tt,
    ls,
    season: jezeroSeason(ls),
    stars,
    lineSegments,
    labels,
    bodies,
    sun,
    sunFixed,
  };
}

export function formatUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm} UTC`;
}
