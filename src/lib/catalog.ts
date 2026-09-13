import catalog from "../data/sky-catalog.json";

export type StarRecord = {
  ra: number;
  dec: number;
  mag: number;
  bv: number;
  name?: string;
};

export type ConstellationRecord = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  lines: number[][][];
};

export const STARS = catalog.stars as StarRecord[];
export const CONSTELLATIONS = catalog.constellations as ConstellationRecord[];
