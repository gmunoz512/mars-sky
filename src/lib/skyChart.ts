import { JEZERO } from "./jezero";
import { rad } from "./math";
import type { CivilDate, SkyBody, SkyModel, SkyStar } from "./sky";

export const POSTER_WIDTH = 1200;
export const POSTER_HEIGHT = 1600;
export const POSTER_HEADLINE = "BIRTHDAY OVER JEZERO";
export const POSTER_PLACE = "JEZERO CRATER, MARS";

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

export type ChartXY = { x: number; y: number };

export type PosterCaption = {
  headline: string;
  date: string;
  place: string;
  coords: string;
};

export type PosterLayout = {
  width: number;
  height: number;
  inset: number;
  cx: number;
  cy: number;
  chartR: number;
  headlineY: number;
  dateY: number;
  placeY: number;
  coordsY: number;
};

/**
 * Azimuthal equidistant whole-sky disc, looking up from Jezero.
 * Center = zenith, rim = horizon. North is up; east is left (sky, not map).
 * Unit circle: r = (90° − alt) / 90°.
 */
export function projectHorizon(azDeg: number, altDeg: number): ChartXY {
  const r = (90 - altDeg) / 90;
  const az = rad(azDeg);
  return {
    x: -r * Math.sin(az),
    y: r * Math.cos(az),
  };
}

/** ENU-like Three.js dir (+x east, +y up, +z south) → azimuth / altitude. */
export function dirToHorizon(dir: { x: number; y: number; z: number }): {
  az: number;
  alt: number;
} {
  const east = dir.x;
  const up = dir.y;
  const north = -dir.z;
  const horiz = Math.hypot(east, north);
  return {
    az: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360,
    alt: (Math.atan2(up, horiz) * 180) / Math.PI,
  };
}

export function clipSegmentToUnitCircle(
  a: ChartXY,
  b: ChartXY,
): [ChartXY, ChartXY] | null {
  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;
  const ra2 = ax * ax + ay * ay;
  const rb2 = bx * bx + by * by;
  if (ra2 <= 1 && rb2 <= 1) return [a, b];

  const dx = bx - ax;
  const dy = by - ay;
  const A = dx * dx + dy * dy;
  if (A < 1e-16) return ra2 <= 1 ? [a, b] : null;

  const B = 2 * (ax * dx + ay * dy);
  const C = ra2 - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;

  const s = Math.sqrt(disc);
  const t1 = (-B - s) / (2 * A);
  const t2 = (-B + s) / (2 * A);
  const hits: number[] = [];
  for (const t of [t1, t2]) {
    if (t >= -1e-6 && t <= 1 + 1e-6) hits.push(Math.min(1, Math.max(0, t)));
  }
  if (hits.length === 2 && Math.abs(hits[0]! - hits[1]!) < 1e-9) hits.pop();

  const at = (t: number): ChartXY => ({ x: ax + t * dx, y: ay + t * dy });

  if (ra2 <= 1 && rb2 > 1) {
    const t = hits.find((v) => v > 1e-6) ?? 1;
    return [a, at(t)];
  }
  if (rb2 <= 1 && ra2 > 1) {
    const t = [...hits].reverse().find((v) => v < 1 - 1e-6) ?? 0;
    return [at(t), b];
  }
  if (hits.length >= 2) return [at(hits[0]!), at(hits[1]!)];
  return null;
}

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
  };
}

export function posterLayout(
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
): PosterLayout {
  const inset = Math.round(Math.min(width, height) * 0.046);
  const chartR = Math.round(Math.min(width * 0.412, height * 0.312));
  const cx = width / 2;
  const topGap = inset + Math.round(height * 0.048);
  const cy = topGap + chartR;
  const textTop = cy + chartR + Math.round(height * 0.068);
  return {
    width,
    height,
    inset,
    cx,
    cy,
    chartR,
    headlineY: textTop,
    dateY: textTop + Math.round(height * 0.048),
    placeY: textTop + Math.round(height * 0.078),
    coordsY: textTop + Math.round(height * 0.108),
  };
}

export function starRadius(mag: number, chartR: number): number {
  const scale = chartR / 480;
  const t = Math.max(0, 6.6 - mag);
  return Math.max(0.38 * scale, (0.2 * t + 0.055 * t * t) * scale);
}

export function bodyRadius(body: SkyBody, chartR: number): number {
  const scale = chartR / 480;
  if (body.kind === "earth") return 2.6 * scale;
  if (body.kind === "satellite") return 2.15 * scale;
  if (body.kind === "planet") return 2.35 * scale;
  return 2.1 * scale;
}

function toCanvas(p: ChartXY, layout: PosterLayout): ChartXY {
  return {
    x: layout.cx + p.x * layout.chartR,
    y: layout.cy - p.y * layout.chartR,
  };
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

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: SkyStar[],
  layout: PosterLayout,
) {
  const sorted = [...stars].sort((a, b) => b.mag - a.mag);
  for (const star of sorted) {
    if (star.alt < 0) continue;
    const p = toCanvas(projectHorizon(star.az, star.alt), layout);
    const r = starRadius(star.mag, layout.chartR);
    if (r > 1.35) {
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBodies(
  ctx: CanvasRenderingContext2D,
  bodies: SkyBody[],
  layout: PosterLayout,
) {
  for (const body of bodies) {
    if (body.alt < 0 || body.kind === "sun") continue;
    const p = toCanvas(projectHorizon(body.az, body.alt), layout);
    const r = bodyRadius(body, layout.chartR);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawConstellations(
  ctx: CanvasRenderingContext2D,
  lineSegments: number[],
  layout: PosterLayout,
) {
  ctx.strokeStyle = "rgba(255,255,255,0.62)";
  ctx.lineWidth = Math.max(0.65, layout.chartR * 0.00155);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i + 5 < lineSegments.length; i += 6) {
    const a = dirToHorizon({
      x: lineSegments[i]!,
      y: lineSegments[i + 1]!,
      z: lineSegments[i + 2]!,
    });
    const b = dirToHorizon({
      x: lineSegments[i + 3]!,
      y: lineSegments[i + 4]!,
      z: lineSegments[i + 5]!,
    });
    if (a.alt < -4 && b.alt < -4) continue;
    const clipped = clipSegmentToUnitCircle(
      projectHorizon(a.az, a.alt),
      projectHorizon(b.az, b.alt),
    );
    if (!clipped) continue;
    const p = toCanvas(clipped[0], layout);
    const q = toCanvas(clipped[1], layout);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  date: CivilDate,
  layout: PosterLayout,
) {
  const copy = posterCaption(date);
  const headlineSize = Math.round(layout.width * 0.0152);
  const bodySize = Math.round(layout.width * 0.0126);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${headlineSize}px Outfit, "Helvetica Neue", Helvetica, Arial, sans-serif`;
  fillTrackedCenter(
    ctx,
    copy.headline,
    layout.cx,
    layout.headlineY,
    headlineSize * 0.28,
  );
  ctx.font = `400 ${bodySize}px Outfit, "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const track = bodySize * 0.22;
  fillTrackedCenter(ctx, copy.date, layout.cx, layout.dateY, track);
  fillTrackedCenter(ctx, copy.place, layout.cx, layout.placeY, track);
  fillTrackedCenter(ctx, copy.coords, layout.cx, layout.coordsY, track);
}

export function drawSkyPoster(
  ctx: CanvasRenderingContext2D,
  sky: SkyModel,
  date: CivilDate,
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
): PosterLayout {
  const layout = posterLayout(width, height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(layout.cx, layout.cy, layout.chartR, 0, Math.PI * 2);
  ctx.clip();
  drawConstellations(ctx, sky.lineSegments, layout);
  drawStars(ctx, sky.stars, layout);
  drawBodies(ctx, sky.bodies, layout);
  ctx.restore();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.15, layout.width * 0.00135);
  ctx.beginPath();
  ctx.arc(layout.cx, layout.cy, layout.chartR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = Math.max(1.05, layout.width * 0.00115);
  ctx.strokeRect(
    layout.inset + ctx.lineWidth / 2,
    layout.inset + ctx.lineWidth / 2,
    width - layout.inset * 2 - ctx.lineWidth,
    height - layout.inset * 2 - ctx.lineWidth,
  );

  drawCaption(ctx, date, layout);
  return layout;
}

export function renderSkyPoster(
  sky: SkyModel,
  date: CivilDate,
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the sky chart");
  drawSkyPoster(ctx, sky, date, width, height);
  return canvas;
}
