# Mars surface textures

Shipped JPEGs are compressed crops (≤ 2048 px) of NASA public-domain
Perseverance / Mastcam-Z photography. Not a HiRISE DEM or a
photogrammetric mesh.

| File | Source | Credit | What we shipped |
| --- | --- | --- | --- |
| `jezero-horizon.jpg` | [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) — Mastcam-Z 360° view of Van Zyl Overlook, Jezero (April 2021) | NASA/JPL-Caltech/ASU/MSSS | Landscape band; rover hardware at the left/right of the mosaic cropped out; 2048 px wide |
| `jezero-ground.jpg` | Same PIA24663 mosaic | NASA/JPL-Caltech/ASU/MSSS | Near-field soil and rocks, 1536² |

Regenerate from the Photojournal original with
`python3 scripts/prepare-mars-textures.py` (needs Pillow). NASA imagery
is generally not copyrighted; credit as above.
