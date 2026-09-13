import { describe, expect, it } from "vitest";
import {
  GLOBE_CREDIT,
  GLOBE_SOURCES,
  PORTRAIT_FACE,
  VALLES_MARINERIS,
  polarCapExtents,
  portraitFaceUnitFixed,
  vallesMarinerisUnitFixed,
  yawToFaceCamera,
} from "./globe";

describe("GLOBE_SOURCES", () => {
  it("cites the USGS/NASA Viking MDIM mosaic, not a generated albedo", () => {
    expect(GLOBE_CREDIT).toContain("USGS");
    expect(GLOBE_SOURCES[0]!.id).toBe("MDIM21");
    expect(GLOBE_SOURCES[0]!.url).toContain("astrogeology.usgs.gov");
  });
});

describe("Valles Marineris portrait", () => {
  it("places the canyon in the southern mid-latitudes and yields a finite yaw", () => {
    const v = vallesMarinerisUnitFixed();
    expect(v.z).toBeLessThan(0);
    expect(v.x ** 2 + v.y ** 2 + v.z ** 2).toBeCloseTo(1, 5);
    expect(Number.isFinite(yawToFaceCamera(v))).toBe(true);
  });

  it("frames Tharsis west of Valles so the classic scar stays on camera", () => {
    expect(PORTRAIT_FACE.longitudeEastDeg).toBeLessThan(VALLES_MARINERIS.longitudeEastDeg);
    expect(PORTRAIT_FACE.longitudeEastDeg).toBeLessThan(-50);
    expect(Number.isFinite(yawToFaceCamera(portraitFaceUnitFixed()))).toBe(true);
  });
});

describe("polarCapExtents", () => {
  it("shrinks the north residual cap near northern summer", () => {
    const summer = polarCapExtents(90);
    const winter = polarCapExtents(270);
    expect(summer.northDeg).toBeLessThan(winter.northDeg);
    expect(summer.southDeg).toBeGreaterThan(winter.southDeg);
    expect(summer.northDeg).toBeGreaterThan(4);
    expect(summer.southDeg).toBeLessThan(22);
  });
});
