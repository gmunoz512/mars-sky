import { describe, expect, it } from "vitest";
import { JEZERO } from "./jezero";
import {
  clipSegmentToUnitCircle,
  dirToHorizon,
  formatJezeroCoords,
  formatPosterDate,
  posterCaption,
  posterLayout,
  POSTER_HEADLINE,
  POSTER_HEIGHT,
  POSTER_PLACE,
  POSTER_WIDTH,
  projectHorizon,
  starRadius,
} from "./skyChart";
import { computeSky } from "./sky";

describe("azimuthal equidistant whole-sky projection", () => {
  it("puts zenith at the origin", () => {
    const p = projectHorizon(0, 90);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });

  it("puts the horizon on the unit circle with north up and east left", () => {
    const north = projectHorizon(0, 0);
    expect(north.x).toBeCloseTo(0, 10);
    expect(north.y).toBeCloseTo(1, 10);

    const east = projectHorizon(90, 0);
    expect(east.x).toBeCloseTo(-1, 10);
    expect(east.y).toBeCloseTo(0, 10);

    const south = projectHorizon(180, 0);
    expect(south.x).toBeCloseTo(0, 10);
    expect(south.y).toBeCloseTo(-1, 10);

    const west = projectHorizon(270, 0);
    expect(west.x).toBeCloseTo(1, 10);
    expect(west.y).toBeCloseTo(0, 10);
  });

  it("scales radius with zenith distance", () => {
    const mid = projectHorizon(0, 45);
    expect(mid.x).toBeCloseTo(0, 10);
    expect(mid.y).toBeCloseTo(0.5, 10);
  });

  it("round-trips ENU directions used by constellation segments", () => {
    const h = dirToHorizon({ x: 1, y: 0, z: 0 });
    expect(h.az).toBeCloseTo(90, 6);
    expect(h.alt).toBeCloseTo(0, 6);

    const zenith = dirToHorizon({ x: 0, y: 1, z: 0 });
    expect(zenith.alt).toBeCloseTo(90, 6);
  });
});

describe("unit-circle clipping", () => {
  it("keeps segments that already lie in the disc", () => {
    const clipped = clipSegmentToUnitCircle({ x: 0, y: 0 }, { x: 0.2, y: 0.3 });
    expect(clipped).toEqual([
      { x: 0, y: 0 },
      { x: 0.2, y: 0.3 },
    ]);
  });

  it("clips a radial segment at the horizon", () => {
    const clipped = clipSegmentToUnitCircle({ x: 0, y: 0 }, { x: 0, y: 2 });
    expect(clipped).not.toBeNull();
    expect(clipped![0]).toEqual({ x: 0, y: 0 });
    expect(clipped![1].x).toBeCloseTo(0, 6);
    expect(clipped![1].y).toBeCloseTo(1, 6);
  });

  it("drops segments that miss the disc", () => {
    expect(clipSegmentToUnitCircle({ x: 2, y: 0 }, { x: 3, y: 0 })).toBeNull();
  });
});

describe("poster copy and layout", () => {
  it("sets a Jezero birthday caption in the reference style", () => {
    const cap = posterCaption({ year: 2020, month: 11, day: 3 });
    expect(cap.headline).toBe(POSTER_HEADLINE);
    expect(cap.date).toBe("NOVEMBER 3, 2020");
    expect(cap.place).toBe(POSTER_PLACE);
    expect(cap.coords).toBe(formatJezeroCoords());
    expect(formatPosterDate({ year: 2021, month: 2, day: 18 })).toBe(
      "FEBRUARY 18, 2021",
    );
    expect(cap.coords).toMatch(/18\.445°N \/ 77\.451°E/);
    expect(JEZERO.latitudeDeg).toBeCloseTo(18.4446, 4);
    expect(JEZERO.longitudeEastDeg).toBeCloseTo(77.4509, 4);
  });

  it("places the sky disc in the upper half with footer text below it", () => {
    const layout = posterLayout(POSTER_WIDTH, POSTER_HEIGHT);
    expect(layout.chartR).toBeGreaterThan(POSTER_WIDTH * 0.35);
    expect(layout.cy + layout.chartR).toBeLessThan(layout.headlineY);
    expect(layout.headlineY).toBeGreaterThan(POSTER_HEIGHT * 0.7);
    expect(layout.coordsY).toBeLessThan(POSTER_HEIGHT - layout.inset);
    expect(layout.cy).toBeLessThan(POSTER_HEIGHT * 0.45);
  });

  it("makes brighter stars larger", () => {
    expect(starRadius(0, 480)).toBeGreaterThan(starRadius(4, 480));
    expect(starRadius(6, 480)).toBeLessThan(1);
  });
});

describe("birthday sky on the chart", () => {
  it("projects the Jezero midnight field into the disc", () => {
    const sky = computeSky({ year: 2021, month: 2, day: 18 });
    const up = sky.stars.filter((s) => s.alt >= 0);
    expect(up.length).toBeGreaterThan(200);
    for (const star of up) {
      const p = projectHorizon(star.az, star.alt);
      expect(p.x * p.x + p.y * p.y).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(sky.lineSegments.length).toBeGreaterThan(100);
    const earth = sky.bodies.find((b) => b.kind === "earth");
    if (earth && earth.alt >= 0) {
      const p = projectHorizon(earth.az, earth.alt);
      expect(p.x * p.x + p.y * p.y).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
