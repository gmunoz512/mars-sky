import { describe, expect, it } from "vitest";
import { SURFACE_TWEEN_MS, smoothstep, tweenApproach } from "./approach";

describe("smoothstep", () => {
  it("is 0 at the start and 1 at the end, slower in the middle than linear", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0.25)).toBeLessThan(0.25);
    expect(smoothstep(0.75)).toBeGreaterThan(0.75);
  });
});

describe("tweenApproach", () => {
  it("stays at orbit until elapsed time moves, and lands on 1 at duration", () => {
    expect(tweenApproach(0, 1, 0, SURFACE_TWEEN_MS)).toBe(0);
    expect(tweenApproach(0, 1, SURFACE_TWEEN_MS, SURFACE_TWEEN_MS)).toBe(1);
    expect(tweenApproach(0, 1, SURFACE_TWEEN_MS * 2, SURFACE_TWEEN_MS)).toBe(1);
  });

  it("is continuous — no snap through the mid-flight mount threshold", () => {
    const mid = tweenApproach(0, 1, SURFACE_TWEEN_MS * 0.62, SURFACE_TWEEN_MS);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(0.9);
  });
});
