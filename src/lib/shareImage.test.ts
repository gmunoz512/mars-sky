import { describe, expect, it } from "vitest";
import { shareImageFilename } from "./shareImage";
import { posterCaption } from "./skyChart";

describe("share image", () => {
  it("names the JPEG for a camera roll", () => {
    expect(shareImageFilename({ year: 1990, month: 7, day: 20 })).toBe(
      "birthday-over-jezero-1990-07-20.jpg",
    );
  });

  it("uses the whole-sky poster caption, not a live-view label", () => {
    const cap = posterCaption({ year: 2024, month: 3, day: 18 });
    expect(cap.headline).toBe("BIRTHDAY OVER JEZERO");
    expect(cap.date).toBe("MARCH 18, 2024");
    expect(cap.place).toBe("JEZERO CRATER, MARS");
  });
});
