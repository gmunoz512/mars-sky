import { Body, RotationAxis, type AstroTime } from "astronomy-engine";
import {
  type Mat3,
  type Vec3,
  deg,
  iauR1,
  iauR3,
  mulMat,
  mulVec,
  normalize,
  transpose,
} from "./math";
import { JEZERO } from "./jezero";

/**
 * ICRF/EQJ → Mars body-fixed (IAU).
 * R = R3(W) · R1(90° − δ0) · R3(90° + α0)
 * α0, δ0, W from astronomy-engine RotationAxis (IAU WGCCRE 2015).
 */
export function marsBodyFixedFromEqj(time: AstroTime): {
  eqjToFixed: Mat3;
  fixedToEqj: Mat3;
  raDeg: number;
  decDeg: number;
  spinDeg: number;
  northEqj: Vec3;
} {
  const axis = RotationAxis(Body.Mars, time);
  const raDeg = axis.ra * 15;
  const decDeg = axis.dec;
  const spinDeg = axis.spin;
  const eqjToFixed = mulMat(
    mulMat(iauR3(spinDeg), iauR1(90 - decDeg)),
    iauR3(90 + raDeg),
  );
  return {
    eqjToFixed,
    fixedToEqj: transpose(eqjToFixed),
    raDeg,
    decDeg,
    spinDeg,
    northEqj: { x: axis.north.x, y: axis.north.y, z: axis.north.z },
  };
}

/** Observer position in Mars body-fixed km (IAU +X = Airy-0 prime meridian). */
export function jezeroBodyFixedKm(): Vec3 {
  const lat = (JEZERO.latitudeDeg * Math.PI) / 180;
  const lon = (JEZERO.longitudeEastDeg * Math.PI) / 180;
  const r = JEZERO.marsRadiusKm + JEZERO.elevationM / 1000;
  const c = Math.cos(lat);
  return {
    x: r * c * Math.cos(lon),
    y: r * c * Math.sin(lon),
    z: r * Math.sin(lat),
  };
}

export type Horizon = {
  azimuthDeg: number;
  altitudeDeg: number;
  /** ENU-like Three.js: +x east, +y up, +z south. */
  east: number;
  up: number;
  south: number;
};

/**
 * Body-fixed topocentric vector → local horizon.
 * Azimuth: 0° north, 90° east (astronomical).
 */
export function bodyFixedToHorizon(topocentricFixed: Vec3): Horizon {
  const lat = (JEZERO.latitudeDeg * Math.PI) / 180;
  const lon = (JEZERO.longitudeEastDeg * Math.PI) / 180;
  const slon = Math.sin(lon);
  const clon = Math.cos(lon);
  const slat = Math.sin(lat);
  const clat = Math.cos(lat);
  const { x, y, z } = topocentricFixed;
  const east = -slon * x + clon * y;
  const north = -slat * clon * x - slat * slon * y + clat * z;
  const up = clat * clon * x + clat * slon * y + slat * z;
  const horiz = Math.hypot(east, north);
  return {
    azimuthDeg: (deg(Math.atan2(east, north)) + 360) % 360,
    altitudeDeg: deg(Math.atan2(up, horiz)),
    east,
    up,
    south: -north,
  };
}

export function eqjToHorizon(
  eqjVector: Vec3,
  eqjToFixed: Mat3,
  observerFixedKm?: Vec3,
): Horizon {
  let fixed = mulVec(eqjToFixed, eqjVector);
  if (observerFixedKm) {
    // eqjVector must be in the same units as the observer (km) for parallax.
    fixed = {
      x: fixed.x - observerFixedKm.x,
      y: fixed.y - observerFixedKm.y,
      z: fixed.z - observerFixedKm.z,
    };
  }
  return bodyFixedToHorizon(fixed);
}

export function horizonDirection(h: Horizon): Vec3 {
  return normalize({ x: h.east, y: h.up, z: h.south });
}
