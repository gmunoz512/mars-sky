# Mars surface textures

Shipped JPEGs are compressed crops (≤ 2048 px) of NASA public-domain
Perseverance / Mastcam-Z photography. Not a HiRISE DEM or a
photogrammetric mesh. Credit: **NASA/JPL-Caltech/ASU/MSSS**.

More 360s: [Mastcam-Z 360 panorama collection](https://mastcamz.asu.edu/mastcam-zs-360-panorama-collection/).

| File | Source | What we shipped |
| --- | --- | --- |
| `jezero-delta.jpg` | [PIA24921](https://photojournal.jpl.nasa.gov/catalog/PIA24921) Jezero delta panorama (also [JPL](https://www.jpl.nasa.gov/images/pia24921-detailed-panorama-of-mars-jezero-crater-delta/)) | Facing landscape: delta butte + pavement; rover deck cropped out; 2048 px wide |
| `jezero-ground.jpg` | Same PIA24921 mosaic | Near-field cracked pavement / soil, 1536² |
| `jezero-horizon.jpg` | [PIA24663](https://photojournal.jpl.nasa.gov/catalog/PIA24663) Van Zyl Overlook 360° | Full look-around wrap; rover hardware cropped; 2048 px wide |
| `jezero-climb.jpg` | [PIA26378](https://photojournal.jpl.nasa.gov/catalog/PIA26378) mid-climb Jezero view | Crater-floor vista when looking east-southeast; mosaic mask cropped; 2048 px wide |

Regenerate with `python3 scripts/prepare-mars-textures.py` (needs Pillow). NASA imagery is generally not copyrighted; credit as above.
