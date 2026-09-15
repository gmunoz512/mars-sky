import { describe, expect, it } from "vitest";
import {
  GLOBE_CREDIT,
  GLOBE_SOURCES,
  ORBIT_FOV_DEG,
  ORBIT_MOON_FAR,
  ORBIT_MOON_NEAR,
  ORBIT_SKY_FAR,
  ORBIT_SKY_NEAR,
  PORTRAIT_FACE,
  VALLES_MARINERIS,
  ORBIT_FILL,
  clampOrbitPitch,
  narrowerFovDeg,
  orbitBodyOccluded,
  orbitCameraDir,
  orbitCameraDistance,
  orbitSkyDistance,
  orbitSkyPosition,
  polarCapExtents,
  portraitFaceUnitFixed,
  rayHitsSphereBefore,
  sphereAngularDiameterDeg,
  yawToFaceCamera,
} from "./globe";
import { computeSky } from "./sky";

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

describe("orbit sky placement", () => {
  const camera = { x: 0, y: 0, z: 10 };

  it("puts planets beyond the phone camera so they read as background sky", () => {
    const phone = orbitCameraDistance(390 / 844, ORBIT_FOV_DEG);
    expect(ORBIT_SKY_NEAR).toBeGreaterThan(phone);
    expect(orbitSkyDistance(0.35, "earth")).toBeGreaterThan(phone);
    expect(orbitSkyDistance(1.5, "sun")).toBeGreaterThan(orbitSkyDistance(0.5, "planet"));
    expect(orbitSkyDistance(5, "planet")).toBeGreaterThan(orbitSkyDistance(1.5, "sun"));
    expect(orbitSkyDistance(10, "planet")).toBeLessThanOrEqual(ORBIT_SKY_FAR);
  });

  it("keeps Phobos and Deimos close to Mars, inward of every planet shell", () => {
    expect(orbitSkyDistance(9_375 / 149_597_870.7, "satellite")).toBeGreaterThan(ORBIT_MOON_NEAR - 0.05);
    expect(orbitSkyDistance(23_458 / 149_597_870.7, "satellite")).toBeLessThan(ORBIT_MOON_FAR + 0.05);
    expect(orbitSkyDistance(23_458 / 149_597_870.7, "satellite")).toBeLessThan(ORBIT_SKY_NEAR);
  });

  it("hides a body behind the globe and keeps one in the surrounding sky", () => {
    expect(rayHitsSphereBefore(camera, { x: 0, y: 0, z: -20 }, 1.02)).toBe(true);
    expect(orbitBodyOccluded(camera, { x: 0, y: 0, z: -20 })).toBe(true);
    expect(orbitBodyOccluded(camera, { x: 24, y: 0, z: 0 })).toBe(false);
  });

  it("keeps a moon in front of the disk (transit), not treated as a limb sticker", () => {
    expect(orbitBodyOccluded(camera, { x: 0, y: 0, z: 4 })).toBe(false);
  });

  it("places a body-fixed direction on the compressed shell in Three.js axes", () => {
    const pos = orbitSkyPosition({ x: 1, y: 0, z: 0 }, 1.5, "sun");
    const r = Math.hypot(pos.x, pos.y, pos.z);
    expect(r).toBeCloseTo(orbitSkyDistance(1.5, "sun"), 5);
    expect(pos.x).toBeGreaterThan(0);
    expect(Math.abs(pos.y)).toBeLessThan(1e-9);
  });

  it("reveals different bodies as the camera orbits, including Earth and the Sun", () => {
    const sky = computeSky({ year: 2021, month: 2, day: 18 });
    const yaw = yawToFaceCamera(portraitFaceUnitFixed());
    const camDist = orbitCameraDistance(1440 / 900, ORBIT_FOV_DEG);
    const halfFov = ((ORBIT_FOV_DEG * Math.PI) / 180) * 0.85;
    const seen = new Set<string>();
    const occludedAtRest = new Set<string>();
    const dir0 = orbitCameraDir(0, 0.16);
    const cam0 = { x: dir0.x * camDist, y: dir0.y * camDist, z: dir0.z * camDist };
    const rotY = (v: { x: number; y: number; z: number }, yawRad: number) => {
      const c = Math.cos(yawRad);
      const s = Math.sin(yawRad);
      return { x: c * v.x + s * v.z, y: v.y, z: -s * v.x + c * v.z };
    };
    for (const body of sky.orbitBodies) {
      const world = rotY(orbitSkyPosition(body.fixed, body.distAu, body.kind), yaw);
      if (orbitBodyOccluded(cam0, world)) occludedAtRest.add(body.id);
    }
    for (let i = 0; i < 16; i++) {
      const dir = orbitCameraDir((i / 16) * Math.PI * 2, 0.16);
      const camera = { x: dir.x * camDist, y: dir.y * camDist, z: dir.z * camDist };
      const lookLen = Math.hypot(camera.x, camera.y, camera.z);
      for (const body of sky.orbitBodies) {
        const world = rotY(orbitSkyPosition(body.fixed, body.distAu, body.kind), yaw);
        if (orbitBodyOccluded(camera, world)) continue;
        const vx = world.x - camera.x;
        const vy = world.y - camera.y;
        const vz = world.z - camera.z;
        const vLen = Math.hypot(vx, vy, vz);
        const cos = (-camera.x * vx - camera.y * vy - camera.z * vz) / (vLen * lookLen);
        const ang = Math.acos(Math.min(1, Math.max(-1, cos)));
        if (ang < halfFov) seen.add(body.id);
      }
    }
    expect(seen.has("earth")).toBe(true);
    expect(seen.has("sun")).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(5);
    expect(occludedAtRest.size).toBeGreaterThan(0);
    expect([...occludedAtRest].some((id) => seen.has(id))).toBe(true);
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
