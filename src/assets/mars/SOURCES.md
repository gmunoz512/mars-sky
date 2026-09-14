# Mars textures

Shipped JPEGs are compressed public-domain NASA / USGS products.
None of this is a HiRISE DEM or a photogrammetric mesh.

## Surface — Perseverance / Mastcam-Z

Credit: **NASA/JPL-Caltech/ASU/MSSS**.

| File | Source | What we shipped |
| --- | --- | --- |
| `jezero-horizon.jpg` | [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) Van Zyl Overlook 360° | Full-width 360 wrap, rover hardware cropped/inpainted, 4096×1024 (hill rows kept; both axes ≤ 4096 WebGL cap) |
| `jezero-ground.jpg` | Same PIA24663 mosaic | Near-field rocks / soil, 1536² |

One cylinder only. PIA24921 and PIA26378 are not composited as extra panels —
those mismatched horizon heights were the visible seam.

More 360s: [Mastcam-Z 360 panorama collection](https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/).

## Orbit globe — Viking MDIM 2.1

Credit: **NASA/JPL/USGS**.

| File | Source | What we shipped |
| --- | --- | --- |
| `mars-albedo.jpg` | [USGS Viking MDIM 2.1 colorized global mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m) (1 km/px reduction on [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg)) | Equirectangular 2048×1024, lon 0° at center (Airy-0) |
| `mars-bump.jpg` | Derived from the same mosaic luminance | High-pass bump for dusty relief |

Regenerate with `python3 scripts/prepare-mars-textures.py` (needs Pillow + NumPy).

These JPEGs are NASA / USGS public-domain imagery. They are **not** covered by
the repository MIT license. Credit NASA/JPL/USGS (globe) and
NASA/JPL-Caltech/ASU/MSSS (surface) if you reuse them.
