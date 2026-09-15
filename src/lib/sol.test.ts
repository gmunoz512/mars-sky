import { describe, expect, it } from "vitest";
import { MakeTime } from "astronomy-engine";
import { findJezeroMidnight, localTrueSolarTimeHours } from "./midnight";
import {
  airyMeanTimeHours,
  formatMarsClock,
  jezeroClock,
  marsSolDate,
  perseveranceSol,
} from "./sol";

describe("Mars24 mean solar time", () => {
  it("matches the Jan 6 2000 Airy midnight benchmark", () => {
    const time = MakeTime(new Date("2000-01-06T00:00:00Z"));
    const msd = marsSolDate(time.tt);
    const mst = airyMeanTimeHours(msd);
    expect(mst).toBeCloseTo(23.99425, 2);
    expect(formatMarsClock(mst)).toMatch(/^(23:5\d|00:00)$/);
  });
});

describe("Jezero sol clock", () => {
  it("reads local true solar midnight as 00:00", () => {
    const utc = findJezeroMidnight(2021, 2, 18);
    expect(localTrueSolarTimeHours(utc)).toBeLessThan(0.05);
    const time = MakeTime(utc);
    const clock = jezeroClock(time.tt, utc);
    expect(clock.ltst).toBe("00:00");
    expect(clock.perseveranceSol).toBe(0);
    expect(clock.solLabel).toBe("Sol 0");
  });

  it("advances Perseverance sols after landing", () => {
    const utc = findJezeroMidnight(2021, 6, 1);
    const time = MakeTime(utc);
    const clock = jezeroClock(time.tt, utc);
    expect(clock.perseveranceSol).not.toBeNull();
    expect(clock.perseveranceSol!).toBeGreaterThan(90);
    expect(clock.perseveranceSol!).toBeLessThan(120);
    expect(perseveranceSol(clock.msd)).toBe(clock.perseveranceSol);
  });

  it("falls back to MSD before Perseverance landed", () => {
    const utc = findJezeroMidnight(1990, 7, 20);
    const time = MakeTime(utc);
    const clock = jezeroClock(time.tt, utc);
    expect(clock.perseveranceSol).toBeNull();
    expect(clock.solLabel.startsWith("MSD ")).toBe(true);
    expect(clock.ltst).toBe("00:00");
  });
});
