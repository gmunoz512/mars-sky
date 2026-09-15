import { useCallback, useRef, useState } from "react";
import type { Scale } from "./ScaleToggle";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function useScale(initial: Scale = "orbit") {
  const [scale, setScale] = useState<Scale>(initial);
  const [approach, setApproach] = useState(initial === "surface" ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const rafRef = useRef(0);

  const animateApproach = useCallback((from: number, to: number, ms: number, done: () => void) => {
    cancelAnimationFrame(rafRef.current);
    if (prefersReducedMotion()) {
      setApproach(to);
      done();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setApproach(from + (to - from) * smoothstep(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else done();
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const goSurface = useCallback(() => {
    if (busy || scale === "surface") return;
    setBusy(true);
    animateApproach(approach, 1, 1600, () => {
      setScale("surface");
      setBusy(false);
    });
  }, [animateApproach, approach, busy, scale]);

  const goOrbit = useCallback(() => {
    if (busy || scale === "orbit") return;
    setBusy(true);
    setScale("orbit");
    setApproach(1);
    requestAnimationFrame(() => {
      animateApproach(1, 0, 1400, () => setBusy(false));
    });
  }, [animateApproach, busy, scale]);

  const setScaleExplicit = useCallback(
    (next: Scale) => {
      if (next === "surface") goSurface();
      else goOrbit();
    },
    [goOrbit, goSurface],
  );

  return { scale, approach, busy, goSurface, goOrbit, setScaleExplicit };
}
