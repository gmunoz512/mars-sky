# birthday in mars

A static page that computes the night sky above **Jezero crater, Mars** for a visitor’s full birthday (year, month, day).

Site: Perseverance / Jezero, 18.4446°N, 77.4509°E (planetocentric). The sky is shown at **local true solar midnight** — the instant the Sun is at lower culmination as seen from that crater, due north and far below the horizon. The UTC moment used is printed in the UI.

Live URL after GitHub Pages is enabled:

`https://gmunoz512.github.io/mars-sky/`

## Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL (base path `/` in development).

```bash
npm run build
npm run preview
```

Production build writes to `dist/`. In GitHub Actions the Vite base is `/mars-sky/` for project Pages.

```bash
npm test
```

## GitHub Pages

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds on every push to `main` and deploys the `dist/` artifact with GitHub Pages.

One-time repo settings:

1. **Settings → Pages → Source**: GitHub Actions (not “Deploy from a branch”).
2. Push to `main` (or run the workflow manually).
3. The site is served at `https://<user>.github.io/mars-sky/`.

For a user/org root site instead, set `VITE_BASE=/` in the workflow and host at `https://<user>.github.io/`.

## What it shows

A single full-viewport canvas (the page does not scroll). Overlay chrome only: title, birthday fields, zoom, footnotes.

1. **Orbit** (default) — a complete Viking MDIM 2.1 Mars globe centered in black space (NASA/JPL/USGS), Valles Marineris facing the camera, soft southern terminator, thin dusty limb, Jezero pin. The camera sits far enough back that a phone shows the whole planet with black space around it. The WebGL canvas is sized to the CSS box (not the device-pixel buffer) so a 2–3× phone cannot shove the globe into a corner. Drag or swipe to orbit up, down, left, and right. Approach lighting eases toward midnight at Jezero.
2. **Surface** — standing in Jezero: one seamless Perseverance Mastcam-Z 360 ([PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) Van Zyl Overlook) on the horizon and ground, computed night sky above. Hipparcos stars, IAU figures, Earth/planets when up, Phobos and Deimos. Drag to look around. NASA/JPL-Caltech/ASU/MSSS. Not a HiRISE DEM. Daylight photo; midnight sky.

**Interaction:** **Zoom in**, the crater pin, or scroll/pinch in. Completing or changing a birthday (year + month + day) also zooms in automatically; further date edits update the sky in place. **Zoom out** or scroll/pinch out returns to the globe. `prefers-reduced-motion` skips the tween.

- Bright stars (Hipparcos-based, mag ≤ 6) and IAU constellation stick figures / Latin names
- Sun, Earth, the Moon, and the major planets when they are above the Jezero horizon
- Phobos and Deimos at approximate topocentric positions
- A second surface view you can drag, at the same midnight

The figures are the **same 88 IAU constellations** as on Earth, rotated into the Jezero horizon. This page does not invent a Mars-only mythology.

Default date is 18 February 2021 (Perseverance landing). Changing year, month, or day recomputes the surface sky and the globe’s sunlight.

## Science

| Piece | Source | Notes |
| --- | --- | --- |
| Stars | ESA Hipparcos / Yale Bright Star, packaged by [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-2-Clause) | J2000 RA/Dec, mag ≤ 6. Proper motion omitted (arcminutes over a lifetime). |
| Constellation lines | d3-celestial IAU stick figures | Same official 88 constellations. Serpens is drawn in two parts. |
| Planets, Sun, Earth, Moon | [astronomy-engine](https://github.com/cosinekitty/astronomy) (VSOP87 / NOVAS) | Mars-centered vectors with a one-step light-time correction. Valid roughly 1600–2400; best near 1800–2100. |
| Mars orientation | IAU WGCCRE 2015 via astronomy-engine `RotationAxis` (α₀, δ₀, W) | ICRF → body-fixed → Jezero horizon (east-north-up). |
| Local midnight | Sun hour angle 180° at Jezero | Nearest midnight to 12:00 UTC on the selected civil date. A Mars sol is 24h 39m 35s. |
| Season (Ls) | Allison & McEwen 2000 / [NASA Mars24](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html) | Label; light seasonal frost overlay on the Viking mosaic. |
| Orbit globe | [USGS Viking MDIM 2.1 colorized mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m) + derived bump. NASA/JPL/USGS. | Equirectangular albedo in `src/assets/mars/`. Default camera frames a complete sphere (shorter viewport axis); portrait faces Valles Marineris. Fly-in uses midnight sunlight at Jezero. |
| Surface terrain | Perseverance Mastcam-Z [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) Van Zyl 360. NASA/JPL-Caltech/ASU/MSSS. Collection: [mastcamz.asu.edu](https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/) | One photo cylinder + faded ground disc (`src/assets/mars/`). Not a HiRISE/MOLA mesh. Daylight albedo under a midnight sky. Rover hardware cropped out. Photo azimuth is not surveyed to Jezero north. Extra mosaics are not overlaid — that was the horizon seam. |
| Phobos, Deimos | Jacobson (2010), *AJ* 139, 668, Table 6; Phobos ½ṅ from Brozović, Jacobson & Park (2025), *AJ* | Mean precessing ellipses on each Laplace plane, not JPL MAR099 / Horizons. |

### Phobos and Deimos accuracy

The moons are **not** integrated Horizons ephemerides. They are mean Keplerian ellipses with published node and periapsis rates, plus a tidal acceleration for Phobos. Typical along-track error is a few degrees near the present and grows over decades (Phobos more than Deimos). That is enough to put each moon in the correct region of sky. It is **not** enough for transit, eclipse, or occultation predictions.

Aberration, refraction (Mars’s atmosphere is thin), and stellar proper motion are omitted. Star positions stay in J2000; the Mars pole is also expressed in J2000, so the frames match.

## Stack

Vite, React, TypeScript, Three.js, Tailwind CSS, astronomy-engine. No backend.

## License notes

Application code in this repository is available for reuse with the project. Star and constellation data retain their upstream terms (d3-celestial BSD-2-Clause; Hipparcos: ESA). Cite the papers above if you reuse the moon model. Surface photographs are NASA/JPL-Caltech/ASU/MSSS public-domain imagery (PIA24663). The orbit globe uses the USGS/NASA Viking MDIM 2.1 colorized mosaic. See [`src/assets/mars/SOURCES.md`](src/assets/mars/SOURCES.md).
