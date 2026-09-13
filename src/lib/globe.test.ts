import { describe, expect, it } from "vitest";
import {
  GLOBE_CREDIT,
  GLOBE_SOURCES,
  ORBIT_FOV_DEG,
  PORTRAIT_FACE,
  VALLES_MARINERIS,
  narrowerFovDeg,
  orbitCameraDistance,
  polarCapExtents,
  portraitFaceUnitFixed,
  sphereAngularDiameterDeg,
  yawToFaceCamera,
} from "./globe";

describe("GLOBE_SOURCES", () => {
  it("cites the USGS/NASA Viking MDIM mosaic, not a generated albedo", () => {
    expect(GLOBE_CREDIT).toContain("USGS");
    expect(GLOBE_SOURCES[0]!.id).toBe("MDIM21");
    expect(GLOBE_SOURCES[0]!.url).toContain("astrogeology.usgs.gov");
  });
});

describe("orbitCameraDistance", () => {
  it("pulls back on a phone so the full sphere fits with black space", () => {
    const phone = 390 / 844;
    const d = orbitCameraDistance(phone, ORBIT_FOV_DEG);
    const ang = sphereAngularDiameterDeg(d);
    const narrow = narrowerFovDeg(phone, ORBIT_FOV_DEG);
    expect(d).toBeGreaterThan(8);
    expect(ang).toBeLessThan(narrow * 0.72);
    expect(ang).toBeGreaterThan(narrow * 0.38);
    // The old fixed dist ≈ 3.35 cropped the globe to a surface patch on phones.
    expect(sphereAngularDiameterDeg(3.35)).toBeGreaterThan(narrow);
  });

  it("still frames a complete globe on a landscape desktop", () => {
    const wide = 1440 / 900;
    const d = orbitCameraDistance(wide, ORBIT_FOV_DEG);
    const ang = sphereAngularDiameterDeg(d);
    const narrow = narrowerFovDeg(wide, ORBIT_FOV_DEG);
    expect(ang).toBeLessThan(narrow * 0.72);
    expect(d).toBeGreaterThan(4);
  });
});

describe("portrait face", () => {
  it("keeps Tharsis west of Valles so the canyon stays on camera", () => {
    expect(PORTRAIT_FACE.longitudeEastDeg).toBeLessThan(VALLES_MARINERIS.longitudeEastDeg);
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
