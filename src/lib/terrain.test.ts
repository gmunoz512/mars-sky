import { describe, expect, it } from "vitest";
import { RIM_RADIUS, buildJezeroTerrainGeometry, sampleJezeroHeight } from "./terrain";

describe("sampleJezeroHeight", () => {
  it("puts the eastern rim above the crater floor", () => {
    const floor = sampleJezeroHeight(0, 0);
    const eastRim = sampleJezeroHeight(RIM_RADIUS, 0);
    expect(eastRim).toBeGreaterThan(floor + 0.35);
  });

  it("breaks the western rim relative to the east (delta inlet)", () => {
    const east = sampleJezeroHeight(RIM_RADIUS, 0);
    const west = sampleJezeroHeight(-RIM_RADIUS, 0);
    expect(west).toBeLessThan(east - 0.25);
  });

  it("raises a western fan inside the bowl", () => {
    const floor = sampleJezeroHeight(0.4, 0.2);
    const fan = sampleJezeroHeight(-5.2, -0.4);
    expect(fan).toBeGreaterThan(floor);
  });

  it("returns finite heights across the grid", () => {
    for (let x = -20; x <= 20; x += 5) {
      for (let z = -20; z <= 20; z += 5) {
        expect(Number.isFinite(sampleJezeroHeight(x, z))).toBe(true);
      }
    }
  });
});

describe("buildJezeroTerrainGeometry", () => {
  it("emits positions, vertex colors, and an index", () => {
    const geo = buildJezeroTerrainGeometry();
    const pos = geo.getAttribute("position");
    const col = geo.getAttribute("color");
    expect(pos.count).toBeGreaterThan(1000);
    expect(col.count).toBe(pos.count);
    expect(geo.getIndex()?.count).toBeGreaterThan(pos.count);
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
    }
    expect(maxY).toBeGreaterThan(minY + 0.4);
    geo.dispose();
  });
});
