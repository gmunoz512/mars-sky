import { useCallback, useEffect, useRef, useState } from "react";
import { ORBIT_TWEEN_MS, SURFACE_TWEEN_MS, tweenApproach } from "../lib/approach";
import type { Scale } from "./ScaleToggle";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useScale(initial: Scale = "orbit", prepareSurface?: () => Promise<void>) {
  const [scale, setScale] = useState<Scale>(initial);
  const [skyMounted, setSkyMounted] = useState(initial === "surface");
  const [busy, setBusy] = useState(false);
  const approachRef = useRef(initial === "surface" ? 1 : 0);
  const busyRef = useRef(false);
  const scaleRef = useRef(scale);
  const prepareRef = useRef(prepareSurface);
  const rafRef = useRef(0);
  scaleRef.current = scale;
  prepareRef.current = prepareSurface;

  const animateApproach = useCallback((from: number, to: number, ms: number, done: () => void) => {
    cancelAnimationFrame(rafRef.current);
    if (prefersReducedMotion()) {
      approachRef.current = to;
      done();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      approachRef.current = tweenApproach(from, to, now - t0, ms);
      if (now - t0 < ms) rafRef.current = requestAnimationFrame(tick);
      else {
        approachRef.current = to;
        done();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const goSurface = useCallback(() => {
    if (busyRef.current || scaleRef.current === "surface") return;
    busyRef.current = true;
    setBusy(true);
    // Mount SkyView now so decode/upload/compile happen on a still orbit frame,
    // not mid-flight when approach crosses 0.62.
    setSkyMounted(true);
    void Promise.resolve()
      .then(() => prepareRef.current?.())
      .catch((err) => {
        console.error("surface warmup failed", err);
      })
      .then(() => {
        animateApproach(approachRef.current, 1, SURFACE_TWEEN_MS, () => {
          setScale("surface");
          busyRef.current = false;
          setBusy(false);
        });
      });
  }, [animateApproach]);

  const goOrbit = useCallback(() => {
    if (busyRef.current || scaleRef.current === "orbit") return;
    busyRef.current = true;
    setBusy(true);
    setScale("orbit");
    approachRef.current = 1;
    requestAnimationFrame(() => {
      animateApproach(1, 0, ORBIT_TWEEN_MS, () => {
        setSkyMounted(false);
        busyRef.current = false;
        setBusy(false);
      });
    });
  }, [animateApproach]);

  const setScaleExplicit = useCallback(
    (next: Scale) => {
      if (next === "surface") goSurface();
      else goOrbit();
    },
    [goOrbit, goSurface],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { scale, approachRef, busy, skyMounted, goSurface, goOrbit, setScaleExplicit };
}
