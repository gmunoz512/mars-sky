import { useMemo, useState } from "react";
import { DatePicker } from "./components/DatePicker";
import { SkyView } from "./components/SkyView";
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

  return (
    <div className="min-h-screen bg-dusk text-ink">
      <header className="mx-auto flex max-w-6xl items-baseline justify-between px-6 pb-2 pt-8 sm:px-10">
        <p className="font-serif text-2xl tracking-tight">jezero</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
          {JEZERO.name} · {JEZERO.rover}
        </p>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-10 sm:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-rust">
            A birthday, held still
          </p>
          <h1 className="mt-4 max-w-md font-serif text-4xl leading-[1.1] sm:text-5xl">
            The night over the crater.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/75">
            Enter a date. This page computes the sky above Jezero crater — 18.4°
            north on Mars — at local true solar midnight on that Earth calendar
            day. The stars are Hipparcos lights. The figures are the IAU
            constellations. The horizon is not Earth’s.
          </p>
          <div className="mt-10">
            <DatePicker value={date} onChange={setDate} />
          </div>
          <p className="mt-6 text-[12px] leading-relaxed text-mute">
            Local true solar midnight at {JEZERO.latitudeDeg.toFixed(4)}°N,{" "}
            {JEZERO.longitudeEastDeg.toFixed(4)}°E. The Sun is at lower
            culmination, due north and far below the horizon. Instant used:{" "}
            <span className="text-ink/70">{formatUtc(sky.utc)}</span>.
          </p>
        </div>

        <div>
          <SkyView
            sky={sky}
            mode="locked"
            className="aspect-[4/5] w-full rounded-sm border border-ink/10 sm:aspect-[5/4]"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-mute">
            <p>Ls {sky.ls.toFixed(1)}° · {sky.season} at Jezero</p>
            <p className="text-ink/45">slow drift · midnight is fixed</p>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
          <p className="max-w-3xl text-[13px] leading-relaxed text-ink/70">
            These are the same 88 IAU constellations drawn on Earth’s sky,
            oriented as they stand from Mars. No separate Mars-only mythology is
            invented here.
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
            drag to orbit
          </p>
        </div>
        <SkyView sky={sky} mode="look" className="h-[78vh] min-h-[28rem] w-full" />
      </section>

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
          Sources are listed in the README.
        </p>
        <p className="mt-8 text-[10px] uppercase tracking-[0.28em]">
          jezero · a static page · no accounts
        </p>
      </footer>
    </div>
  );
}
