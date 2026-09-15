import { describe, expect, it } from "vitest";
import {
  SHARE_IMAGE_MAX_EDGE,
  capturePreferredView,
  shareImageCaption,
  shareImageFilename,
  shareImageSize,
} from "./shareImage";

describe("share image caption", () => {
  it("labels a Jezero sky with the birthday and site", () => {
    const cap = shareImageCaption({ year: 2024, month: 3, day: 18 }, "surface");
    expect(cap.headline).toBe("18 March 2024");
    expect(cap.kicker).toBe("birthday over Jezero");
    expect(cap.place).toBe("Jezero crater");
  });

  it("marks an orbit snapshot without pretending it is the crater floor", () => {
    const cap = shareImageCaption({ year: 2021, month: 2, day: 18 }, "orbit");
    expect(cap.headline).toBe("18 February 2021");
    expect(cap.place).toBe("Mars from orbit");
  });

  it("names the JPEG for a camera roll", () => {
    expect(shareImageFilename({ year: 1990, month: 7, day: 20 })).toBe(
      "birthday-over-jezero-1990-07-20.jpg",
    );
  });
});

describe("share image size", () => {
  it("keeps a capture as-is when under the cap", () => {
    expect(shareImageSize(780, 1440)).toEqual({ width: 780, height: 1440 });
  });

  it("scales a high-DPI capture down to the long-edge cap", () => {
    const s = shareImageSize(2340, 5064);
    expect(Math.max(s.width, s.height)).toBe(SHARE_IMAGE_MAX_EDGE);
    expect(s.width / s.height).toBeCloseTo(2340 / 5064, 3);
  });
});

describe("capturePreferredView", () => {
  const skyCanvas = { id: "sky" } as unknown as HTMLCanvasElement;
  const globeCanvas = { id: "globe" } as unknown as HTMLCanvasElement;

  it("prefers the Jezero sky when that view is active", () => {
    expect(
      capturePreferredView(
        true,
        () => skyCanvas,
        () => globeCanvas,
      ),
    ).toBe(skyCanvas);
  });

  it("falls back to orbit when the sky is not mounted", () => {
    expect(capturePreferredView(true, null, () => globeCanvas)).toBe(globeCanvas);
    expect(
      capturePreferredView(
        false,
        () => skyCanvas,
        () => globeCanvas,
      ),
    ).toBe(globeCanvas);
  });
});
