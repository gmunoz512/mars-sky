import { useMemo, useState } from "react";
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
  if (up.length === 0) return "No planets or moons sit above this horizon at midnight.";
  return `Above the horizon: ${up.join(" · ")}`;
}

export default function App() {
  const [date, setDate] = useState<CivilDate>(DEFAULT_DATE);
  const sky = useMemo(() => computeSky(date), [date]);
  const { scale, approach, busy, goSurface, setScaleExplicit } = useScale();
  const onSurface = scale === "surface";
  const showSky = onSurface || approach > 0.62;

  return (
    <div className="min-h-screen bg-dusk text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 pb-2 pt-8 sm:px-10">
        <p className="font-serif text-xl tracking-tight sm:text-2xl">birthday in mars</p>
        <ScaleToggle value={scale} onChange={setScaleExplicit} disabled={busy} />
        <p className="hidden text-[10px] font-medium uppercase tracking-[0.28em] text-mute sm:block">
          {JEZERO.name} · {JEZERO.rover}
        </p>
      </header>

      <section className="relative mt-6">
        <div className="relative h-[78vh] min-h-[28rem] w-full overflow-hidden">
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
              <SkyView sky={sky} mode="locked" className="h-full w-full" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-dusk via-dusk/50 to-transparent px-6 pb-8 pt-24 sm:px-10">
            <div className="mx-auto max-w-6xl">
              {onSurface ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-rust">
                    Surface · Jezero
                  </p>
                  <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[1.1] sm:text-5xl">
                    birthday in mars
                  </h1>
                  <p className="mt-3 max-w-lg font-serif text-xl text-ink/70 sm:text-2xl">
                    The night over the crater.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-rust">
                    Orbit
                  </p>
                  <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[1.1] sm:text-5xl">
                    birthday in mars
                  </h1>
                  <p className="mt-3 max-w-lg font-serif text-xl text-ink/70 sm:text-2xl">
                    Mars, at a quiet distance.
                  </p>
                  <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-ink/70">
                    A shaded globe — not a spacecraft mosaic. Lighting is the Sun
                    at Jezero’s local true solar midnight for the date below.
                    The crater sits on the night side. Drag to turn. Click the
                    pin, or Surface, to stand in the atmosphere and look out.
                  </p>
                  <button
                    type="button"
                    onClick={goSurface}
                    disabled={busy}
                    className="pointer-events-auto mt-6 border border-ink/20 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] text-ink/85 transition hover:border-rust/60 hover:text-ink disabled:opacity-40"
                  >
                    Stand on Jezero
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-rust">
            A birthday, held still
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/75">
            {onSurface
              ? "Enter a date. This page computes the sky above Jezero crater — 18.4° north on Mars — at local true solar midnight on that Earth calendar day. The stars are Hipparcos lights. The figures are the IAU constellations. The horizon is not Earth’s."
              : "The date still belongs to a birthday. On the globe it only turns the Sun. The computed sky — stars, figures, moons — waits until you are on the surface."}
          </p>
          <div className="mt-10">
            <DatePicker value={date} onChange={setDate} />
          </div>
          <p className="mt-6 text-[12px] leading-relaxed text-mute">
            Local true solar midnight at {JEZERO.latitudeDeg.toFixed(4)}°N,{" "}
            {JEZERO.longitudeEastDeg.toFixed(4)}°E. Instant used:{" "}
            <span className="text-ink/70">{formatUtc(sky.utc)}</span>.
          </p>
        </div>
        <div className="text-[12px] leading-relaxed text-mute">
          <p>
            Ls {sky.ls.toFixed(1)}° · {sky.season} at Jezero. Polar caps on the
            globe follow that season only in a coarse way. Night-side lighting
            is honest: at this midnight the Sun is below the crater’s horizon.
          </p>
        </div>
      </section>

      {onSurface && (
        <>
          <section className="border-t border-ink/10">
            <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
              <p className="max-w-3xl text-[13px] leading-relaxed text-ink/70">
                These are the same 88 IAU constellations drawn on Earth’s sky,
                oriented as they stand from Mars. No separate Mars-only mythology
                is invented here.
              </p>
              <p className="mt-3 text-[13px] text-ink/55">{bodyLine(sky)}</p>
            </div>
          </section>

          <section className="relative">
            <div className="mx-auto flex max-w-6xl items-end justify-between px-6 pb-4 pt-10 sm:px-10">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-rust">
                  Look around
                </p>
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">The hour stays. You turn.</h2>
                <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink/70">
                  Same birthday, same local midnight. Drag the dome. Cardinals sit
                  on the crater rim: north is the Mars celestial pole, 18.4° up.
                </p>
              </div>
              <p className="hidden text-[11px] uppercase tracking-[0.22em] text-mute sm:block">
                drag to look
              </p>
            </div>
            <SkyView sky={sky} mode="look" className="h-[78vh] min-h-[28rem] w-full" />
          </section>
        </>
      )}

      <footer className="mx-auto max-w-6xl px-6 py-14 text-[12px] leading-relaxed text-mute sm:px-10">
        <p>
          Phobos and Deimos use Jacobson (2010) mean Laplace-plane elements plus
          a Brozović et al. (2025) tidal term for Phobos — a precessing-ellipse
          approximation, not JPL Horizons. Positions are meant to place each
          moon in the correct region of sky; along-track error of a few degrees
          is expected, and it grows over decades.
        </p>
        <p className="mt-4">
          Bright stars: Hipparcos-based magnitude ≤ 6 catalog via d3-celestial.
          Planetary vectors: astronomy-engine (VSOP87 / NOVAS). Mars orientation:
          IAU WGCCRE 2015 via astronomy-engine <span className="text-ink/50">RotationAxis</span>.
          The orbit globe is a generated albedo with a thin atmospheric limb —
          not a Viking or MGS mosaic. Sources are listed in the README.
        </p>
        <p className="mt-8 text-[10px] uppercase tracking-[0.28em]">
          birthday in mars · a static page · no accounts
        </p>
      </footer>
    </div>
  );
}
