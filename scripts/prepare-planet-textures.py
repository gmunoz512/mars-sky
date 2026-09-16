#!/usr/bin/env python3
"""Compress NASA / USGS (and one CC-BY Saturn map) textures for orbit-sky globes.

Bodies are small on screen, so we ship 1024×512 (moons 512×256) equirectangular
JPEGs. Regenerate with: python3 scripts/prepare-planet-textures.py
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/nasa-planets")
OUT = ROOT / "src" / "assets" / "planets"

UA = "birthday-in-mars/1.0 (educational; NASA/USGS public-domain maps)"

# Visible Earth Blue Marble (no clouds) + separate cloud layer.
EARTH_URL = "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg"
CLOUDS_URL = "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg"
# Cassini cylindrical Jupiter (PIA07782).
JUPITER_URL = "https://images-assets.nasa.gov/image/PIA07782/PIA07782~orig.jpg"
# Solar System Scope 2k sun (CC BY 4.0, NASA-based photosphere wrap).
SUN_TITLE = "File:Solarsystemscope texture 2k sun.jpg"


def wiki_thumb(title: str, width: int = 2048) -> str:
    qs = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": str(width),
        }
    )
    req = urllib.request.Request(
        f"https://commons.wikimedia.org/w/api.php?{qs}",
        headers={"User-Agent": UA},
    )
    data = json.load(urllib.request.urlopen(req, timeout=30))
    pages = data["query"]["pages"]
    info = next(iter(pages.values()))["imageinfo"][0]
    return info.get("thumburl") or info["url"]


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 8_000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as src, dest.open("wb") as out:
        out.write(src.read())
    print("downloaded", dest.name, dest.stat().st_size)


def save_jpeg(im: Image.Image, path: Path, size: tuple[int, int], quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB").resize(size, Image.Resampling.LANCZOS)
    rgb.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print("wrote", path.name, path.stat().st_size, "px", size)


def blend_clouds(base: Image.Image, clouds: Image.Image) -> Image.Image:
    a = np.asarray(base.convert("RGB"), dtype=np.float32)
    c = np.asarray(clouds.convert("RGB").resize(base.size, Image.Resampling.LANCZOS), dtype=np.float32)
    alpha = np.clip(c.mean(axis=2, keepdims=True) / 255.0, 0, 1)
    # Keep Earth blue; lift only the bright cloud mass.
    out = a * (1 - 0.82 * alpha) + np.maximum(a, c) * (0.82 * alpha)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def colorize_mercury(im: Image.Image) -> Image.Image:
    """MDIS global mosaic thumbs are often luma-only; tint toward MESSENGER's tan."""
    gray = ImageOps.grayscale(im)
    return ImageOps.colorize(gray, black="#16110e", white="#efe4d2", mid="#a88868").convert("RGB")


def tone_deimos(phobos: Image.Image) -> Image.Image:
    """No public-domain 2:1 Deimos mosaic shipped; cooler, paler Phobos Viking."""
    arr = np.asarray(phobos.convert("RGB"), dtype=np.float32)
    arr[..., 0] *= 0.86
    arr[..., 1] *= 0.90
    arr[..., 2] *= 0.98
    arr = np.clip(arr * 0.92 + 10, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def make_saturn_rings(src: Image.Image, width: int = 1024, height: int = 64) -> Image.Image:
    """Keep the CC-BY ring strip as RGBA (alpha from luminance if RGB)."""
    im = src.convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
    arr = np.asarray(im)
    if arr[..., 3].max() < 8:
        lum = arr[..., :3].max(axis=2)
        arr[..., 3] = lum
        im = Image.fromarray(arr, "RGBA")
    return im


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    mercury_path = TMP / "mercury.jpg"
    venus_path = TMP / "venus.jpg"
    earth_path = TMP / "earth.jpg"
    clouds_path = TMP / "clouds.jpg"
    jupiter_path = TMP / "jupiter.jpg"
    saturn_path = TMP / "saturn.jpg"
    rings_path = TMP / "saturn-rings.png"
    sun_path = TMP / "sun.jpg"
    phobos_path = TMP / "phobos.jpg"

    download(wiki_thumb("File:Mercury MESSENGER MDIS Basemap MD3Color Mosaic Global 32ppd.jpg", 2048), mercury_path)
    download(wiki_thumb("File:Cylindrical Map of Venus.jpg", 2048), venus_path)
    download(EARTH_URL, earth_path)
    download(CLOUDS_URL, clouds_path)
    download(JUPITER_URL, jupiter_path)
    download(wiki_thumb("File:Solarsystemscope texture 2k saturn.jpg", 2048), saturn_path)
    download(wiki_thumb("File:Solarsystemscope texture 2k saturn ring alpha.png", 2048), rings_path)
    download(wiki_thumb(SUN_TITLE, 2048), sun_path)
    download(wiki_thumb("File:Phobos Viking Mosaic DLRcontrol 7200.jpg", 1600), phobos_path)

    save_jpeg(colorize_mercury(Image.open(mercury_path)), OUT / "mercury.jpg", (1024, 512), 84)
    save_jpeg(Image.open(venus_path), OUT / "venus.jpg", (1024, 512), 84)

    earth = Image.open(earth_path)
    clouds = Image.open(clouds_path)
    save_jpeg(blend_clouds(earth, clouds), OUT / "earth.jpg", (1024, 512), 86)

    save_jpeg(Image.open(jupiter_path), OUT / "jupiter.jpg", (1024, 512), 85)
    save_jpeg(Image.open(saturn_path), OUT / "saturn.jpg", (1024, 512), 85)

    rings = make_saturn_rings(Image.open(rings_path))
    rings.save(OUT / "saturn-rings.png", "PNG", optimize=True)
    print("wrote", "saturn-rings.png", (OUT / "saturn-rings.png").stat().st_size)

    save_jpeg(Image.open(sun_path), OUT / "sun.jpg", (1024, 512), 86)

    phobos = Image.open(phobos_path)
    save_jpeg(phobos, OUT / "phobos.jpg", (512, 256), 82)
    save_jpeg(tone_deimos(phobos), OUT / "deimos.jpg", (512, 256), 82)

    print("wrote", sorted(p.name for p in OUT.glob("*") if p.suffix in {".jpg", ".png"}))


if __name__ == "__main__":
    main()
