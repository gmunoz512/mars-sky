import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATE,
  buildShareUrl,
  formatShareHeadline,
  formatShareSearch,
  parseShareSearch,
  shareCardCopy,
} from "./share";

describe("share links", () => {
  it("round-trips a surface birthday", () => {
    const state = { date: { year: 2024, month: 3, day: 18 }, view: "surface" as const };
    const search = formatShareSearch(state);
    expect(search).toBe("d=2024-03-18&v=surface");
    const parsed = parseShareSearch(`?${search}`);
    expect(parsed.date).toEqual(state.date);
    expect(parsed.view).toBe("surface");
    expect(parsed.fromShare).toBe(true);
  });

  it("treats missing view as orbit and invalid dates as the fallback", () => {
    expect(parseShareSearch("?d=1990-07-20")).toEqual({
      date: { year: 1990, month: 7, day: 20 },
      view: "orbit",
      fromShare: true,
    });
    expect(parseShareSearch("?d=not-a-date", DEFAULT_DATE)).toEqual({
      date: DEFAULT_DATE,
      view: "orbit",
      fromShare: false,
    });
    expect(parseShareSearch("").fromShare).toBe(false);
  });

  it("builds a client-only URL from origin + path", () => {
    const url = buildShareUrl(
      { date: { year: 2021, month: 2, day: 18 }, view: "surface" },
      { origin: "https://gmunoz512.github.io", pathname: "/mars-sky/" },
    );
    expect(url).toBe("https://gmunoz512.github.io/mars-sky/?d=2021-02-18&v=surface");
  });

  it("writes a share card for that birthday over Jezero", () => {
    const copy = shareCardCopy({ year: 2024, month: 3, day: 18 });
    expect(copy.title).toBe("My birthday over Jezero");
    expect(copy.text).toBe("My birthday over Jezero — 18 March 2024");
    expect(formatShareHeadline({ year: 2021, month: 2, day: 18 })).toBe("18 February 2021");
  });
});
