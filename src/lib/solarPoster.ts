import { Body, EclipticLongitude, HelioVector, MakeTime } from "astronomy-engine";
import { JEZERO } from "./jezero";
import { findJezeroMidnight } from "./midnight";
import { rad, wrap180 } from "./math";
import type { CivilDate } from "./sky";

export const POSTER_WIDTH = 1200;
export const POSTER_HEIGHT = 1600;
export const POSTER_INK = "#e6d6b8";
export const POSTER_PLACE = "JEZERO CRATER, MARS";
export const POSTER_HEADLINE = [
  "JUST A SMALL PART",
  "OF A MUCH BIGGER STORY",
] as const;
export const POSTER_TAGLINE = [
  "CURIOSITY CREATES",
  "A BRIGHTER TOMORROW",
] as const;

/** Slightly isometric view of coplanar circular orbits. */
export const ORBIT_TILT = 0.4;

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export const SOLAR_PLANETS = [
  { body: Body.Mercury, id: "mercury", name: "Mercury" },
  { body: Body.Venus, id: "venus", name: "Venus" },
  { body: Body.Earth, id: "earth", name: "Earth" },
  { body: Body.Mars, id: "mars", name: "Mars" },
  { body: Body.Jupiter, id: "jupiter", name: "Jupiter" },
  { body: Body.Saturn, id: "saturn", name: "Saturn" },
  { body: Body.Uranus, id: "uranus", name: "Uranus" },
  { body: Body.Neptune, id: "neptune", name: "Neptune" },
] as const;

export type SolarPlanetId = (typeof SOLAR_PLANETS)[number]["id"];

export type SolarPlanet = {
  id: SolarPlanetId;
  name: string;
  /** Heliocentric ecliptic longitude, degrees [0, 360). */
  lonDeg: number;
  distAu: number;
  orbitIndex: number;
};

export type SolarSystem = {
  utc: Date;
  planets: SolarPlanet[];
};

export type PosterCaption = {
  headline: readonly [string, string];
  date: string;
  place: string;
  coords: string;
  tagline: readonly [string, string];
};

export type PosterLayout = {
  width: number;
  height: number;
  inset: number;
  cx: number;
  cy: number;
  orbitCount: number;
  innerRx: number;
  outerRx: number;
  tilt: number;
  sunR: number;
  headlineY: [number, number];
  dateY: number;
  placeY: number;
  coordsY: number;
  taglineY: [number, number];
};

export type ChartXY = { x: number; y: number };

export function formatPosterDate(date: CivilDate): string {
  const month = MONTHS[date.month - 1] ?? "JANUARY";
  return `${month} ${date.day}, ${date.year}`;
}

export function formatJezeroCoords(): string {
  const lat = Math.abs(JEZERO.latitudeDeg).toFixed(3);
  const lon = Math.abs(JEZERO.longitudeEastDeg).toFixed(3);
  const ns = JEZERO.latitudeDeg >= 0 ? "N" : "S";
  const ew = JEZERO.longitudeEastDeg >= 0 ? "E" : "W";
  return `${lat}°${ns} / ${lon}°${ew}`;
}

export function posterCaption(date: CivilDate): PosterCaption {
  return {
    headline: POSTER_HEADLINE,
    date: formatPosterDate(date),
    place: POSTER_PLACE,
    coords: formatJezeroCoords(),
    tagline: POSTER_TAGLINE,
  };
}

export function posterLayout(
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
): PosterLayout {
  const inset = Math.round(Math.min(width, height) * 0.055);
  const cx = width / 2;
  const cy = height * 0.445;
  const outerRx = Math.round(Math.min(width * 0.38, height * 0.268));
  return {
    width,
    height,
    inset,
    cx,
    cy,
    orbitCount: SOLAR_PLANETS.length,
    innerRx: Math.round(outerRx * 0.36),
    outerRx,
    tilt: ORBIT_TILT,
    sunR: Math.round(outerRx * 0.1),
    headlineY: [inset + height * 0.072, inset + height * 0.098],
    dateY: height * 0.775,
    placeY: height * 0.808,
    coordsY: height * 0.838,
    taglineY: [height * 0.888, height * 0.918],
  };
}

export function orbitRadiusX(orbitIndex: number, layout: PosterLayout): number {
  const n = Math.max(1, layout.orbitCount - 1);
  const t = orbitIndex / n;
  return layout.innerRx + t * (layout.outerRx - layout.innerRx);
}

/** Place a body on its schematic orbit at a heliocentric ecliptic longitude. */
export function projectSolarPlanet(
  lonDeg: number,
  orbitIndex: number,
  layout: PosterLayout,
): ChartXY {
  const rx = orbitRadiusX(orbitIndex, layout);
  const ry = rx * layout.tilt;
  const a = rad(lonDeg);
  return {
    x: layout.cx + rx * Math.cos(a),
    y: layout.cy - ry * Math.sin(a),
  };
}

export function computeSolarSystem(date: CivilDate): SolarSystem {
  const utc = findJezeroMidnight(date.year, date.month, date.day);
  const time = MakeTime(utc);
  const planets: SolarPlanet[] = SOLAR_PLANETS.map((spec, orbitIndex) => {
    const helio = HelioVector(spec.body, time);
    return {
      id: spec.id,
      name: spec.name,
      lonDeg: EclipticLongitude(spec.body, time),
      distAu: Math.hypot(helio.x, helio.y, helio.z),
      orbitIndex,
    };
  });
  return { utc, planets };
}

export function longitudeSeparationDeg(a: number, b: number): number {
  return Math.abs(wrap180(a - b));
}

function planetDiscRadius(id: SolarPlanetId, layout: PosterLayout): number {
  const scale = layout.outerRx;
  switch (id) {
    case "mercury":
      return 0.018 * scale;
    case "venus":
      return 0.026 * scale;
    case "earth":
      return 0.026 * scale;
    case "mars":
      return 0.034 * scale;
    case "jupiter":
      return 0.048 * scale;
    case "saturn":
      return 0.04 * scale;
    case "uranus":
      return 0.03 * scale;
    case "neptune":
      return 0.029 * scale;
  }
}

function fillTrackedCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  const chars = Array.from(text);
  if (chars.length === 0) return;
  let glyphs = 0;
  for (const ch of chars) glyphs += ctx.measureText(ch).width;
  const total = glyphs + tracking * Math.max(0, chars.length - 1);
  let cursor = x - total / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  ink: string,
) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.7, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.55, size * 0.07);
  const d = size * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - d, y - d);
  ctx.lineTo(x + d, y + d);
  ctx.moveTo(x + d, y - d);
  ctx.lineTo(x - d, y + d);
  ctx.stroke();
  ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, layout: PosterLayout, ink: string) {
  const rand = mulberry32(20210218);
  const pad = layout.inset + 18;
  const topType = layout.headlineY[1] + layout.height * 0.028;
  const bottomType = layout.dateY - layout.height * 0.04;
  for (let i = 0; i < 70; i++) {
    const x = pad + rand() * (layout.width - pad * 2);
    const y = pad + rand() * (layout.height - pad * 2);
    if (y < topType || y > bottomType) continue;
    const dx = (x - layout.cx) / layout.outerRx;
    const dy = (y - layout.cy) / (layout.outerRx * layout.tilt);
    if (dx * dx + dy * dy < 1.22) continue;
    const roll = rand();
    if (roll < 0.18) {
      ctx.globalAlpha = 0.55 + roll;
      drawSparkle(ctx, x, y, 3.2 + rand() * 5.5, ink);
    } else {
      ctx.globalAlpha = 0.28 + roll * 0.45;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, y, 0.55 + rand() * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawSun(ctx: CanvasRenderingContext2D, layout: PosterLayout, ink: string) {
  const { cx, cy, sunR } = layout;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  const rays = 96;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const long = i % 4 === 0;
    const mid = i % 2 === 0;
    const inner = sunR + layout.outerRx * 0.012;
    const outer =
      sunR + layout.outerRx * (long ? 0.092 : mid ? 0.058 : 0.034);
    ctx.globalAlpha = long ? 0.95 : 0.55;
    ctx.lineWidth = long ? 1.15 : 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(cx - sunR * 0.22, cy - sunR * 0.28, sunR * 0.15, cx, cy, sunR);
  g.addColorStop(0, "#f3e6c9");
  g.addColorStop(1, ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrbits(ctx: CanvasRenderingContext2D, layout: PosterLayout, ink: string) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.85, layout.width * 0.00085);
  for (let i = 0; i < layout.orbitCount; i++) {
    const rx = orbitRadiusX(i, layout);
    const ry = rx * layout.tilt;
    ctx.globalAlpha = i === 3 ? 0.95 : 0.55;
    ctx.beginPath();
    ctx.ellipse(layout.cx, layout.cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanetDisc(
  ctx: CanvasRenderingContext2D,
  p: ChartXY,
  r: number,
  ink: string,
  highlight: boolean,
) {
  const g = ctx.createRadialGradient(p.x - r * 0.28, p.y - r * 0.32, r * 0.15, p.x, p.y, r);
  g.addColorStop(0, highlight ? "#f0d8b0" : "#f2e6cc");
  g.addColorStop(1, highlight ? "#c9a06a" : ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSaturnRings(
  ctx: CanvasRenderingContext2D,
  p: ChartXY,
  r: number,
  ink: string,
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-0.42);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1.1, r * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.05, r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(0.7, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.45, r * 0.66, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlanets(
  ctx: CanvasRenderingContext2D,
  system: SolarSystem,
  layout: PosterLayout,
  ink: string,
) {
  const ordered = [...system.planets].sort((a, b) => {
    const pa = projectSolarPlanet(a.lonDeg, a.orbitIndex, layout);
    const pb = projectSolarPlanet(b.lonDeg, b.orbitIndex, layout);
    return pa.y - pb.y;
  });
  for (const planet of ordered) {
    const p = projectSolarPlanet(planet.lonDeg, planet.orbitIndex, layout);
    const r = planetDiscRadius(planet.id, layout);
    const mars = planet.id === "mars";
    if (planet.id === "saturn") drawSaturnRings(ctx, p, r, ink);
    if (mars) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.2, r * 0.18);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawPlanetDisc(ctx, p, r, ink, mars);
    if (mars) {
      ctx.save();
      ctx.fillStyle = ink;
      const size = Math.round(layout.width * 0.0125);
      ctx.font = `400 ${size}px "Fraunces", "Times New Roman", serif`;
      const vx = p.x - layout.cx;
      const vy = p.y - layout.cy;
      const len = Math.hypot(vx, vy) || 1;
      const lx = p.x + (vx / len) * (r * 4.4);
      const ly = p.y + (vy / len) * (r * 4.4) + size * 0.35;
      fillTrackedCenter(ctx, "MARS", lx, ly, size * 0.46);
      ctx.restore();
    }
  }
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  date: CivilDate,
  layout: PosterLayout,
  ink: string,
) {
  const copy = posterCaption(date);
  const serif = `"Fraunces", "Times New Roman", serif`;
  ctx.fillStyle = ink;

  const headSize = Math.round(layout.width * 0.0225);
  ctx.font = `400 ${headSize}px ${serif}`;
  fillTrackedCenter(ctx, copy.headline[0], layout.cx, layout.headlineY[0], headSize * 0.42);
  fillTrackedCenter(ctx, copy.headline[1], layout.cx, layout.headlineY[1], headSize * 0.34);

  const bodySize = Math.round(layout.width * 0.0185);
  ctx.font = `400 ${bodySize}px ${serif}`;
  const track = bodySize * 0.34;
  fillTrackedCenter(ctx, copy.date, layout.cx, layout.dateY, track);
  fillTrackedCenter(ctx, copy.place, layout.cx, layout.placeY, track);
  fillTrackedCenter(ctx, copy.coords, layout.cx, layout.coordsY, bodySize * 0.28);

  const tagSize = Math.round(layout.width * 0.019);
  ctx.font = `italic 400 ${tagSize}px ${serif}`;
  fillTrackedCenter(ctx, copy.tagline[0], layout.cx, layout.taglineY[0], tagSize * 0.38);
  fillTrackedCenter(ctx, copy.tagline[1], layout.cx, layout.taglineY[1], tagSize * 0.32);
}

export function drawSolarPoster(
  ctx: CanvasRenderingContext2D,
  date: CivilDate,
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
  system: SolarSystem = computeSolarSystem(date),
): PosterLayout {
  const layout = posterLayout(width, height);
  const ink = POSTER_INK;
  ctx.fillStyle = "#07060a";
  ctx.fillRect(0, 0, width, height);

  drawStars(ctx, layout, ink);
  drawOrbits(ctx, layout, ink);
  drawSun(ctx, layout, ink);
  drawPlanets(ctx, system, layout, ink);
  drawCaption(ctx, date, layout, ink);

  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.05, layout.width * 0.00115);
  ctx.strokeRect(
    layout.inset + ctx.lineWidth / 2,
    layout.inset + ctx.lineWidth / 2,
    width - layout.inset * 2 - ctx.lineWidth,
    height - layout.inset * 2 - ctx.lineWidth,
  );
  ctx.globalAlpha = 1;
  return layout;
}

export function renderSolarPoster(
  date: CivilDate,
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the poster");
  drawSolarPoster(ctx, date, width, height);
  return canvas;
}
