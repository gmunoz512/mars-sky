import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "./components/DatePicker";
import { GlobeView } from "./components/GlobeView";
import { ScaleToggle } from "./components/ScaleToggle";
import { SkyView } from "./components/SkyView";
import { useScale } from "./components/useScale";
import { JEZERO } from "./lib/jezero";
import { computeSky, formatUtc, type CivilDate } from "./lib/sky";

const DEFAULT_DATE: CivilDate = { year: 2021, month: 2, day: 18 };

function bodyLine(sky: ReturnType<typeof computeSky>): string {
  const up = sky.bodies.filter((b) => b.alt > 0).map((b) => b.name);
  if (up.length === 0) return "No planets or moons above the horizon.";
  return up.join(" · ");
}

export default function App() {
  const [date, setDate] = useState<CivilDate>(DEFAULT_DATE);
  const sky = useMemo(() => computeSky(date), [date]);
  const { scale, approach, busy, goSurface, goOrbit, setScaleExplicit } = useScale();
  const onSurface = scale === "surface";
  const showSky = onSurface || approach > 0.62;

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
          approach={approach}
          className="h-full w-full"
          onEnterSurface={goSurface}
        />
      </div>

      {showSky && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            onSurface ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <SkyView sky={sky} mode="look" className="h-full w-full" />
        </div>
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-8">
        <div>
          <h1 className="font-serif text-xl tracking-tight sm:text-2xl">birthday in mars</h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-mute">
            {JEZERO.name} · {JEZERO.rover}
          </p>
        </div>
        <div className="pointer-events-auto">
          {onSurface && (
            <ScaleToggle value={scale} onChange={setScaleExplicit} disabled={busy} />
          )}
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-dusk/65 via-dusk/18 to-transparent px-5 pb-5 pt-10 sm:px-8 sm:pb-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
              {onSurface
                ? "Local true solar midnight. Drag to look. Horizon is one Perseverance Mastcam-Z 360 (PIA24663), not a HiRISE mesh — daylight photo under a midnight sky."
                : "Set a birthday, then zoom in to stand on Jezero and look out. Drag the globe to turn it."}{" "}
              <span className="text-ink/55">{formatUtc(sky.utc)}</span>
            </p>
          </div>
          <p className="max-w-sm text-[10px] leading-relaxed text-mute/90 sm:text-right">
            {onSurface ? `${bodyLine(sky)}. ` : ""}
            Ls {sky.ls.toFixed(1)}° · {sky.season}. Globe is Viking MDIM 2.1
            (NASA/JPL/USGS), not a generated texture. Terrain: NASA/JPL-Caltech/ASU/MSSS
            PIA24663.
            Phobos/Deimos are mean orbits, not Horizons. {JEZERO.latitudeDeg.toFixed(2)}°N{" "}
            {JEZERO.longitudeEastDeg.toFixed(2)}°E.
          </p>
        </div>
      </div>
    </div>
  );
}
