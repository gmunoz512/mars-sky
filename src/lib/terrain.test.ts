import { describe, expect, it } from "vitest";
import {
  GROUND_RADIUS,
  TERRAIN_CREDIT,
  TERRAIN_SOURCES,
  buildPhotoGroundGeometry,
  sampleGroundHeight,
} from "./terrain";

describe("TERRAIN_SOURCES", () => {
  it("cites the preferred Mastcam-Z public-domain mosaics", () => {
    const pias = TERRAIN_SOURCES.map((s) => s.pia);
    expect(pias).toEqual(["PIA24921", "PIA24663", "PIA26378"]);
    expect(TERRAIN_CREDIT).toContain("NASA");
    for (const src of TERRAIN_SOURCES) {
      expect(src.url).toContain(src.pia);
    }
  });
});

describe("sampleGroundHeight", () => {
  it("stays a shallow ripple, not a cartoon crater wall", () => {
    let max = 0;
    for (let x = -GROUND_RADIUS; x <= GROUND_RADIUS; x += 1) {
      for (let z = -GROUND_RADIUS; z <= GROUND_RADIUS; z += 1) {
        const y = sampleGroundHeight(x, z);
        expect(Number.isFinite(y)).toBe(true);
        max = Math.max(max, Math.abs(y));
      }
    }
    expect(max).toBeLessThan(0.05);
  });
});

describe("buildPhotoGroundGeometry", () => {
  it("emits an indexed disc with UVs for the photo albedo", () => {
    const geo = buildPhotoGroundGeometry();
    const pos = geo.getAttribute("position");
    const uv = geo.getAttribute("uv");
    expect(pos.count).toBeGreaterThan(20);
    expect(uv.count).toBe(pos.count);
    expect(geo.getIndex()?.count).toBeGreaterThan(pos.count);
    geo.dispose();
  });
});
