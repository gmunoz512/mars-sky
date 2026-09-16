import { describe, expect, it } from "vitest";
import { fadeSmooth01, groundRimAlpha, photoTopAlpha } from "./surfaceFade";

describe("groundRimAlpha", () => {
  const w = 2048;
  const h = 2048;

  it("keeps the yard interior opaque", () => {
    expect(groundRimAlpha(1024, 1024, w, h)).toBe(1);
    expect(groundRimAlpha(900, 900, w, h)).toBe(1);
  });

  it("fades the disc corners so the rim cannot read as a circular seam", () => {
    expect(groundRimAlpha(0, 0, w, h)).toBe(0);
    expect(groundRimAlpha(w - 1, 0, w, h)).toBe(0);
    expect(groundRimAlpha(0, h - 1, w, h)).toBe(0);
  });
});

describe("photoTopAlpha", () => {
  it("is transparent at the top of the fade band and opaque below it", () => {
    expect(photoTopAlpha(0, 1024, 0.06)).toBe(0);
    expect(photoTopAlpha(1023, 1024, 0.06)).toBe(1);
    expect(photoTopAlpha(200, 1024, 0.06)).toBe(1);
  });
});

describe("fadeSmooth01", () => {
  it("clamps and eases", () => {
    expect(fadeSmooth01(-1)).toBe(0);
    expect(fadeSmooth01(2)).toBe(1);
    expect(fadeSmooth01(0.5)).toBeCloseTo(0.5);
  });
});
