import { describe, expect, it } from "vitest";
import { formatShareSearch } from "./share";
import {
  SHOW_BIRTHDAY_STORAGE_KEY,
  readShowBirthdayPreference,
  shareImageFilename,
  writeShowBirthdayPreference,
} from "./shareImage";
import { posterCaption, printedPosterLines } from "./solarPoster";

describe("share image", () => {
  it("names the JPEG for a camera roll", () => {
    expect(shareImageFilename({ year: 1990, month: 7, day: 20 })).toBe(
      "birthday-over-jezero-1990-07-20.jpg",
    );
  });

  it("uses the solar-system poster caption, not a live-view label", () => {
    const cap = posterCaption({ year: 2024, month: 3, day: 18 });
    expect(cap.headline[0]).toBe("JUST A SMALL PART");
    expect(cap.date).toBe("MARCH 18, 2024");
    expect(cap.place).toBe("JEZERO CRATER, MARS");
    expect(cap.coords).toBe("18.445°N / 77.451°E");
  });

  it("keeps the date out of the JPEG copy when the birthday is hidden", () => {
    const date = { year: 2024, month: 3, day: 18 };
    expect(printedPosterLines(date, { showBirthday: false })).not.toContain("MARCH 18, 2024");
    expect(shareImageFilename(date)).toBe("birthday-over-jezero-2024-03-18.jpg");
    expect(formatShareSearch({ date, view: "surface" })).toBe("d=2024-03-18&v=surface");
  });

  it("persists the show-birthday preference as 1/0", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(readShowBirthdayPreference(storage)).toBe(true);
    writeShowBirthdayPreference(false, storage);
    expect(store.get(SHOW_BIRTHDAY_STORAGE_KEY)).toBe("0");
    expect(readShowBirthdayPreference(storage)).toBe(false);
    writeShowBirthdayPreference(true, storage);
    expect(readShowBirthdayPreference(storage)).toBe(true);
  });
});
