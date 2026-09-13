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

1. **Orbit** (default) — a dusty red/ochre Mars globe fills the frame, thin rust limb, Jezero pin. Drag to turn. The date sets midnight sunlight and coarse polar caps. Generated albedo, not a Viking/MGS mosaic.
2. **Surface** — standing in Jezero: real Perseverance Mastcam-Z photography on the ground and around the horizon, computed night sky above. Hipparcos stars, IAU figures, Earth/planets when up, Phobos and Deimos. Drag to look around. Default view is the [PIA24921](https://photojournal.jpl.nasa.gov/catalog/PIA24921) delta butte; look-around also uses [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) (Van Zyl 360) and [PIA26378](https://photojournal.jpl.nasa.gov/catalog/PIA26378) (mid-climb). NASA/JPL-Caltech/ASU/MSSS. Not a HiRISE DEM. Daylight photos; midnight sky.

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
| Season (Ls) | Allison & McEwen 2000 / [NASA Mars24](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html) | Label only; coarse polar-cap size on the orbit globe. |
| Orbit globe | Generated albedo + limb glow | Schematic. Sun direction is the real Mars-centered vector at the selected midnight. |
| Surface terrain | Perseverance Mastcam-Z: [PIA24921](https://photojournal.jpl.nasa.gov/catalog/PIA24921) (delta), [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) (Van Zyl 360), [PIA26378](https://photojournal.jpl.nasa.gov/catalog/PIA26378) (mid-climb). NASA/JPL-Caltech/ASU/MSSS. Collection: [mastcamz.asu.edu](https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/) | Textured ground + photo cylinders from compressed in-repo crops (`src/assets/mars/`). Not a HiRISE/MOLA mesh. Daylight albedo under a midnight sky. Rover hardware cropped out. Photo azimuth is not surveyed to Jezero north. |
| Phobos, Deimos | Jacobson (2010), *AJ* 139, 668, Table 6; Phobos ½ṅ from Brozović, Jacobson & Park (2025), *AJ* | Mean precessing ellipses on each Laplace plane, not JPL MAR099 / Horizons. |

### Phobos and Deimos accuracy

The moons are **not** integrated Horizons ephemerides. They are mean Keplerian ellipses with published node and periapsis rates, plus a tidal acceleration for Phobos. Typical along-track error is a few degrees near the present and grows over decades (Phobos more than Deimos). That is enough to put each moon in the correct region of sky. It is **not** enough for transit, eclipse, or occultation predictions.

Aberration, refraction (Mars’s atmosphere is thin), and stellar proper motion are omitted. Star positions stay in J2000; the Mars pole is also expressed in J2000, so the frames match.

## Stack

Vite, React, TypeScript, Three.js, Tailwind CSS, astronomy-engine. No backend.

## License notes

Application code in this repository is available for reuse with the project. Star and constellation data retain their upstream terms (d3-celestial BSD-2-Clause; Hipparcos: ESA). Cite the papers above if you reuse the moon model. Surface photographs are NASA/JPL-Caltech/ASU/MSSS public-domain imagery (PIA24921, PIA24663, PIA26378); see [`src/assets/mars/SOURCES.md`](src/assets/mars/SOURCES.md).
