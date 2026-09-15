import { describe, expect, it } from "vitest";
import {
  POSTER_HEADLINE,
  POSTER_HEIGHT,
  POSTER_PLACE,
  POSTER_TAGLINE,
  POSTER_WIDTH,
  computeSolarSystem,
  formatJezeroCoords,
  formatPosterDate,
  longitudeSeparationDeg,
  orbitRadiusX,
  posterCaption,
  posterLayout,
  projectSolarPlanet,
} from "./solarPoster";

describe("poster copy", () => {
  it("sets the solar-system caption in the reference style", () => {
    const cap = posterCaption({ year: 2021, month: 2, day: 18 });
    expect(cap.headline).toEqual(POSTER_HEADLINE);
    expect(cap.headline[0]).toBe("JUST A SMALL PART");
    expect(cap.date).toBe("FEBRUARY 18, 2021");
    expect(cap.place).toBe(POSTER_PLACE);
    expect(cap.coords).toBe("18.445°N / 77.451°E");
    expect(cap.tagline).toEqual(POSTER_TAGLINE);
    expect(formatPosterDate({ year: 2020, month: 11, day: 3 })).toBe("NOVEMBER 3, 2020");
    expect(formatJezeroCoords()).toMatch(/18\.445°N \/ 77\.451°E/);
  });
});

describe("poster layout", () => {
  it("keeps the diagram in the middle with type above and below", () => {
    const layout = posterLayout(POSTER_WIDTH, POSTER_HEIGHT);
    expect(layout.headlineY[1]).toBeLessThan(layout.cy - layout.outerRx * layout.tilt);
    expect(layout.cy + layout.outerRx * layout.tilt).toBeLessThan(layout.dateY);
    expect(layout.coordsY).toBeLessThan(layout.taglineY[0]);
    expect(layout.taglineY[1]).toBeLessThan(POSTER_HEIGHT - layout.inset);
    expect(orbitRadiusX(3, layout)).toBeGreaterThan(orbitRadiusX(2, layout));
    expect(orbitRadiusX(0, layout)).toBe(layout.innerRx);
    expect(orbitRadiusX(7, layout)).toBe(layout.outerRx);
  });
});

describe("heliocentric birthday positions", () => {
  it("places all eight planets with unit longitudes", () => {
    const system = computeSolarSystem({ year: 2021, month: 2, day: 18 });
    expect(system.planets.map((p) => p.id)).toEqual([
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ]);
    for (const planet of system.planets) {
      expect(planet.lonDeg).toBeGreaterThanOrEqual(0);
      expect(planet.lonDeg).toBeLessThan(360);
      expect(planet.distAu).toBeGreaterThan(0.2);
    }
    const mars = system.planets.find((p) => p.id === "mars")!;
    const earth = system.planets.find((p) => p.id === "earth")!;
    expect(mars.distAu).toBeGreaterThan(earth.distAu);
    expect(mars.orbitIndex).toBe(3);
  });

  it("moves Mars and Earth when the birthday changes", () => {
    const landing = computeSolarSystem({ year: 2021, month: 2, day: 18 });
    const other = computeSolarSystem({ year: 1990, month: 7, day: 20 });
    const marsA = landing.planets.find((p) => p.id === "mars")!;
    const marsB = other.planets.find((p) => p.id === "mars")!;
    const earthA = landing.planets.find((p) => p.id === "earth")!;
    const earthB = other.planets.find((p) => p.id === "earth")!;
    expect(longitudeSeparationDeg(marsA.lonDeg, marsB.lonDeg)).toBeGreaterThan(20);
    expect(longitudeSeparationDeg(earthA.lonDeg, earthB.lonDeg)).toBeGreaterThan(20);

    const layout = posterLayout();
    const pa = projectSolarPlanet(marsA.lonDeg, marsA.orbitIndex, layout);
    const pb = projectSolarPlanet(marsB.lonDeg, marsB.orbitIndex, layout);
    expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeGreaterThan(layout.outerRx * 0.08);
  });

  it("keeps the innermost orbit outside the Sun", () => {
    const layout = posterLayout();
    expect(layout.innerRx * layout.tilt).toBeGreaterThan(
      layout.sunR + layout.outerRx * 0.03,
    );
  });

  it("keeps a planet on its elliptical orbit", () => {
    const layout = posterLayout();
    const p = projectSolarPlanet(40, 3, layout);
    const rx = orbitRadiusX(3, layout);
    const ry = rx * layout.tilt;
    const dx = (p.x - layout.cx) / rx;
    const dy = (p.y - layout.cy) / ry;
    expect(dx * dx + dy * dy).toBeCloseTo(1, 8);
  });
});
