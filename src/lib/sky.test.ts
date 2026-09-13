import { describe, expect, it } from "vitest";
import { Body, HelioVector, MakeTime } from "astronomy-engine";
import { JEZERO } from "./jezero";
import {
  bodyFixedToHorizon,
  eqjToHorizon,
  jezeroBodyFixedKm,
  marsBodyFixedFromEqj,
} from "./marsFrame";
import { hypot3, mulVec } from "./math";
import { findJezeroMidnight, midnightResidualDeg } from "./midnight";
import { marsMoonsEqjKm } from "./moons";
import { computeSky } from "./sky";

describe("Mars body-fixed frame", () => {
  it("maps the IAU north pole to +Z and gives Jezero the correct NCP altitude", () => {
    const time = MakeTime(new Date("2021-02-18T12:00:00Z"));
    const frame = marsBodyFixedFromEqj(time);
    const poleFixed = mulVec(frame.eqjToFixed, frame.northEqj);
    expect(poleFixed.x).toBeCloseTo(0, 5);
    expect(poleFixed.y).toBeCloseTo(0, 5);
    expect(poleFixed.z).toBeCloseTo(1, 5);

    const ncp = bodyFixedToHorizon({ x: 0, y: 0, z: 1 });
    expect(ncp.altitudeDeg).toBeCloseTo(JEZERO.latitudeDeg, 3);
    expect(ncp.azimuthDeg).toBeCloseTo(0, 3);
  });
});

describe("local true solar midnight", () => {
  it("places the Sun near azimuth 0° and well below the Jezero horizon", () => {
    const utc = findJezeroMidnight(2021, 2, 18);
    expect(Math.abs(midnightResidualDeg(utc))).toBeLessThan(0.05);

    const time = MakeTime(utc);
    const mars = HelioVector(Body.Mars, time);
    const sunEqj = { x: -mars.x, y: -mars.y, z: -mars.z };
    const frame = marsBodyFixedFromEqj(time);
    const h = eqjToHorizon(sunEqj, frame.eqjToFixed);
    expect(h.altitudeDeg).toBeLessThan(-50);
    const az = h.azimuthDeg > 180 ? h.azimuthDeg - 360 : h.azimuthDeg;
    expect(Math.abs(az)).toBeLessThan(8);
  });
});

describe("birthday sky", () => {
  it("recomputes a different field when the year changes", () => {
    const a = computeSky({ year: 1990, month: 7, day: 20 });
    const b = computeSky({ year: 2021, month: 7, day: 20 });
    expect(a.utc.getTime()).not.toBe(b.utc.getTime());
    expect(Math.abs(a.ls - b.ls)).toBeGreaterThan(1);
    expect(a.stars.length).toBeGreaterThan(200);
    expect(b.stars.length).toBeGreaterThan(200);
    const namedA = a.labels
      .filter((l) => l.kind === "constellation")
      .map((l) => l.text)
      .sort();
    expect(namedA.length).toBeGreaterThan(10);
  });

  it("keeps Phobos and Deimos near Mars (planetocentric)", () => {
    const time = MakeTime(new Date("2021-02-18T12:00:00Z"));
    const moons = marsMoonsEqjKm(time.tt);
    const observer = hypot3(jezeroBodyFixedKm());
    for (const moon of moons) {
      const r = hypot3(moon.eqjKm);
      expect(r).toBeGreaterThan(observer + 2000);
      expect(r).toBeLessThan(30_000);
    }
  });
});
