import { describe, expect, it } from "vitest";
import {
  GLOBE_CREDIT,
  GLOBE_SOURCES,
  ORBIT_BODY_DISTANCE,
  ORBIT_FOV_DEG,
  PORTRAIT_FACE,
  VALLES_MARINERIS,
  ORBIT_FILL,
  clampOrbitPitch,
  narrowerFovDeg,
  orbitCameraDir,
  orbitCameraDistance,
  orbitMarkerVisible,
  polarCapExtents,
  portraitFaceUnitFixed,
  rayHitsSphereBefore,
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
    expect(d).toBeGreaterThan(10);
    expect(ORBIT_FILL).toBeCloseTo(0.44 * 1.15, 3);
    expect(ORBIT_FILL).toBeLessThan(0.55);
    expect(ang).toBeLessThan(narrow * 0.56);
    expect(ang).toBeGreaterThan(narrow * 0.28);
    // The old fixed dist ≈ 3.35 cropped the globe to a surface patch on phones.
    expect(sphereAngularDiameterDeg(3.35)).toBeGreaterThan(narrow);
  });

  it("still frames a complete globe on a landscape desktop", () => {
    const wide = 1440 / 900;
    const d = orbitCameraDistance(wide, ORBIT_FOV_DEG);
    const ang = sphereAngularDiameterDeg(d);
    const narrow = narrowerFovDeg(wide, ORBIT_FOV_DEG);
    expect(ang).toBeLessThan(narrow * 0.56);
    expect(d).toBeGreaterThan(5);
  });

  it("frames Mars about 15% larger than the previous 0.44 fill", () => {
    const wide = 1440 / 900;
    const now = sphereAngularDiameterDeg(orbitCameraDistance(wide, ORBIT_FOV_DEG));
    const previous = sphereAngularDiameterDeg(
      orbitCameraDistance(wide, ORBIT_FOV_DEG, { fill: 0.44 }),
    );
    expect(now / previous).toBeGreaterThan(1.12);
    expect(now / previous).toBeLessThan(1.2);
  });
});

describe("orbitCameraDir", () => {
  it("starts on +Z and pitches toward +Y", () => {
    const face = orbitCameraDir(0, 0);
    expect(face.z).toBeCloseTo(1, 5);
    expect(face.x).toBeCloseTo(0, 5);
    const north = orbitCameraDir(0, Math.PI / 2);
    expect(north.y).toBeCloseTo(1, 5);
    expect(clampOrbitPitch(4)).toBeLessThan(1.3);
    expect(clampOrbitPitch(-4)).toBeGreaterThan(-1.3);
  });
});

describe("portrait face", () => {
  it("keeps Tharsis west of Valles so the canyon stays on camera", () => {
    expect(PORTRAIT_FACE.longitudeEastDeg).toBeLessThan(VALLES_MARINERIS.longitudeEastDeg);
    expect(Number.isFinite(yawToFaceCamera(portraitFaceUnitFixed()))).toBe(true);
  });
});

describe("orbit planet markers", () => {
  const camera = { x: 0, y: 0, z: 10 };

  it("sits just outside the atmosphere, not on the mosaic", () => {
    expect(ORBIT_BODY_DISTANCE).toBeGreaterThan(1.05);
    expect(ORBIT_BODY_DISTANCE).toBeLessThan(2);
  });

  it("hides a marker behind the globe and one drawn over the disk", () => {
    expect(rayHitsSphereBefore(camera, { x: 0, y: 0, z: -1.48 }, 1.04)).toBe(true);
    expect(orbitMarkerVisible(camera, { x: 0, y: 0, z: -1.48 })).toBe(false);
    expect(orbitMarkerVisible(camera, { x: 0, y: 0, z: 1.48 })).toBe(false);
  });

  it("keeps a marker that has risen around the limb", () => {
    expect(orbitMarkerVisible(camera, { x: 1.48, y: 0, z: 0 })).toBe(true);
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
