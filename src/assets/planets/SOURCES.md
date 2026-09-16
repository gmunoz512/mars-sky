# Orbit-sky body textures

Shipped maps are small equirectangular wraps so the Sun, planets, and moons
read as miniature globes next to the Viking MDIM Mars. They are **not** covered
by the repository MIT license.

Regenerate with `python3 scripts/prepare-planet-textures.py` (Pillow + NumPy).

| File | Source | License / credit | What we shipped |
| --- | --- | --- | --- |
| `sun.jpg` | [Solar System Scope](https://www.solarsystemscope.com/textures/) 2k sun (NASA-based photosphere) | CC BY 4.0 · Solar System Scope | 1024×512 |
| `mercury.jpg` | [MESSENGER MDIS global mosaic](https://commons.wikimedia.org/wiki/File:Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_32ppd.jpg) | Public domain · NASA/JHUAPL/Carnegie | 1024×512, warm tint (thumbs are luma-only) |
| `venus.jpg` | [Magellan cylindrical map](https://commons.wikimedia.org/wiki/File:Cylindrical_Map_of_Venus.jpg) | Public domain · NASA/JPL | 1024×512 |
| `earth.jpg` | [Blue Marble](https://visibleearth.nasa.gov/images/57752/blue-marble-next-generation) land/ocean/ice + [cloud layer](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg) | Public domain · NASA GSFC | 1024×512 composite |
| `jupiter.jpg` | Cassini [PIA07782](https://photojournal.jpl.nasa.gov/catalog/PIA07782) | Public domain · NASA/JPL/SSI | 1024×512 |
| `saturn.jpg` | [Solar System Scope](https://www.solarsystemscope.com/textures/) 2k saturn (Cassini-based) | CC BY 4.0 · Solar System Scope | 1024×512 |
| `saturn-rings.png` | Same, ring alpha strip | CC BY 4.0 · Solar System Scope | 1024×64 RGBA |
| `phobos.jpg` | [Viking mosaic (DLR control)](https://commons.wikimedia.org/wiki/File:Phobos_Viking_Mosaic_DLRcontrol_7200.jpg) | Public domain · NASA/JPL / PDS / Phil Stooke | 512×256 |
| `deimos.jpg` | Toned from the Phobos Viking mosaic (no comparable public-domain 2:1 Deimos map shipped) | Public domain · same as Phobos | 512×256 |

Credit **NASA/JPL/USGS/GSFC/JHUAPL/SSI** and **Solar System Scope** if you reuse
the JPEGs. Solar System Scope maps require CC BY 4.0 attribution.
