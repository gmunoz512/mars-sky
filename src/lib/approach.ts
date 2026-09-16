/** Camera blend for orbit → Jezero. `t` is 0..1 elapsed fraction. */
export function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

export const SURFACE_TWEEN_MS = 1600;
export const ORBIT_TWEEN_MS = 1400;

/** Interpolate approach with the same curve the live tween uses. */
export function tweenApproach(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return to;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return from + (to - from) * smoothstep(t);
}
