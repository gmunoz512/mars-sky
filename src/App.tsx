import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatePicker } from "./components/DatePicker";
import { GlobeView } from "./components/GlobeView";
import { ScaleToggle } from "./components/ScaleToggle";
import { ShareSky } from "./components/ShareSky";
import { SkyCallouts, type SkyLookTarget } from "./components/SkyCallouts";
import { SkyView, type SkyLookAt } from "./components/SkyView";
import { useScale } from "./components/useScale";
import { JEZERO } from "./lib/jezero";
import {
  DEFAULT_DATE,
  formatShareHeadline,
  formatShareSearch,
  isDefaultShare,
  parseShareSearch,
} from "./lib/share";
import { computeSky } from "./lib/sky";
import { preloadSurfaceTextures } from "./lib/surfaceTextures";

const boot =
  typeof window === "undefined"
    ? { date: DEFAULT_DATE, view: "orbit" as const, fromShare: false }
    : parseShareSearch(window.location.search);

export default function App() {
  const [date, setDate] = useState(boot.date);
  const [lookAt, setLookAt] = useState<SkyLookAt | null>(null);
  const sky = useMemo(() => computeSky(date), [date]);
  const skyReady = useRef(false);
  const skyWaiters = useRef<Array<() => void>>([]);

  const onSkyReady = useCallback(() => {
    skyReady.current = true;
    const waiters = skyWaiters.current.splice(0);
    for (const fn of waiters) fn();
  }, []);

  const prepareSurface = useCallback(async () => {
    await preloadSurfaceTextures();
    if (skyReady.current) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timer = window.setTimeout(done, 3000);
      skyWaiters.current.push(() => {
        window.clearTimeout(timer);
        done();
      });
    });
  }, []);

  const { scale, approachRef, busy, skyMounted, goSurface, goOrbit, setScaleExplicit } = useScale(
    boot.view,
    prepareSurface,
  );
  const onSurface = scale === "surface";
  const shareState = { date, view: onSurface ? ("surface" as const) : ("orbit" as const) };
  const earth = sky.bodies.find((b) => b.kind === "earth") ?? null;
  const moons = sky.bodies.filter((b) => b.kind === "satellite");

  const onLook = (target: SkyLookTarget) => {
    setLookAt({ az: target.az, alt: target.alt, nonce: Date.now() });
  };

  useEffect(() => {
    void preloadSurfaceTextures();
  }, []);

  useEffect(() => {
    if (!skyMounted) skyReady.current = false;
  }, [skyMounted]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, select, textarea, button")) return;
      e.preventDefault();
      if (busy) return;
      if (e.deltaY < 0) goSurface();
      else if (e.deltaY > 0) goOrbit();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [busy, goOrbit, goSurface]);

  useEffect(() => {
    document.title = `${formatShareHeadline(date)} over Jezero · birthday in mars`;
  }, [date]);

  useEffect(() => {
    const state = { date, view: onSurface ? ("surface" as const) : ("orbit" as const) };
    const path = window.location.pathname;
    const next = isDefaultShare(state) ? path : `${path}?${formatShareSearch(state)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;
    window.history.replaceState(null, "", next);
  }, [date, onSurface]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-dusk text-ink">
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          onSurface ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <GlobeView
          ls={sky.ls}
          sunFixed={sky.sunFixed}
          orbitBodies={sky.orbitBodies}
          approachRef={approachRef}
          className="h-full w-full"
          onEnterSurface={goSurface}
        />
      </div>

      {skyMounted && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            onSurface ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <SkyView
            sky={sky}
            mode="look"
            lookAt={lookAt}
            className="h-full w-full"
            onReady={onSkyReady}
            active={onSurface}
          />
        </div>
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-8">
        <div>
          <h1 className="font-serif text-xl tracking-tight sm:text-2xl">birthday in mars</h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-mute">
            {JEZERO.name} · {JEZERO.rover}
          </p>
          {onSurface && <SkyCallouts earth={earth} moons={moons} onLook={onLook} />}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {onSurface && (
            <>
              <ShareSky state={shareState} />
              <ScaleToggle value={scale} onChange={setScaleExplicit} disabled={busy} />
            </>
          )}
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-dusk/65 via-dusk/18 to-transparent px-5 pb-5 pt-10 sm:px-8 sm:pb-7">
        <div className="pointer-events-auto w-full max-w-md">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
            Birthday
          </p>
          <DatePicker value={date} onChange={setDate} compact />
          {!onSurface && (
            <button
              type="button"
              disabled={busy}
              onClick={goSurface}
              className="mt-5 border border-ink/25 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] text-ink/90 transition hover:border-rust/70 hover:text-ink disabled:opacity-40"
            >
              Zoom in
            </button>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-mute">
            Set a birthday, then zoom in to stand on Jezero and look out. Drag the globe to look
            around Mars — other worlds sit in that sky.
          </p>
        </div>
      </div>
    </div>
  );
}
