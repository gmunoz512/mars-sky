#!/usr/bin/env python3
"""Compress NASA/USGS public-domain Mars imagery for the shipped page.

Surface (Perseverance / Mastcam-Z, NASA/JPL-Caltech/ASU/MSSS):
  PIA24663  Van Zyl Overlook 360° — full-width horizon wrap + ground
            https://photojournal.jpl.nasa.gov/catalog/PIA24663

Orbit globe (Viking MDIM 2.1 colorized mosaic, NASA/JPL/USGS):
  Wikimedia 1 km/px reduction of the USGS product, downsampled to 2048×1024.
  https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg
  https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m

PIA24921 / PIA26378 are not composited as extra cylinders — those overlays
were the horizon seam.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/nasa-mars")
OUT = ROOT / "src/assets/mars"

PIA24663_URL = "https://images-assets.nasa.gov/image/PIA24663/PIA24663~orig.jpg"
MDIM_TITLE = "File:Mars Viking MDIM21 ClrMosaic 1km.jpg"
UA = "birthday-in-mars/1.0 (educational; NASA/USGS public-domain maps)"


def save_jpeg(im: Image.Image, path: Path, size: tuple[int, int], quality: int) -> None:
    im.convert("RGB").resize(size, Image.Resampling.LANCZOS).save(
        path, "JPEG", quality=quality, optimize=True, progressive=True
    )


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 10_000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as src, dest.open("wb") as out:
        out.write(src.read())


def mdim_thumb_url(width: int = 3840) -> str:
    qs = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": MDIM_TITLE,
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


def fill_mask(arr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Replace masked pixels from the nearest unmasked pixel above, else beside."""
    out = arr.copy()
    h, w = mask.shape
    for y in range(h):
        good_x = np.flatnonzero(~mask[y])
        for x in np.flatnonzero(mask[y]):
            src_y = y - 1
            while src_y >= 0 and mask[src_y, x]:
                src_y -= 1
            if src_y >= 0:
                out[y, x] = arr[src_y, x]
                continue
            if good_x.size == 0:
                continue
            i = int(np.searchsorted(good_x, x))
            if i == 0:
                src = good_x[0]
            elif i >= good_x.size:
                src = good_x[-1]
            else:
                src = good_x[i] if abs(int(good_x[i]) - x) < abs(int(good_x[i - 1]) - x) else good_x[i - 1]
            out[y, x] = arr[y, src]
    return out


def inpaint_rover(im: Image.Image) -> Image.Image:
    """Remove rover metal / mosaic voids that break a seamless 360 wrap."""
    arr = np.asarray(im.convert("RGB"))
    black = arr.max(axis=2) < 18
    # Hardware is near-neutral and sits on the left/right of PIA24663.
    h, w = arr.shape[:2]
    # PIA24663 parks rover hardware on the 360 join (lower-left / lower-right).
    corner = np.zeros((h, w), dtype=bool)
    corner[int(0.78 * h) :, : int(0.07 * w)] = True
    corner[int(0.78 * h) :, int(0.96 * w) :] = True
    return Image.fromarray(fill_mask(arr, black | corner), "RGB")


def blend_wrap_seam(im: Image.Image, blend: int = 12, top_frac: float = 1) -> Image.Image:
    """Crossfade the 360 join so a 1-pixel mosaic mismatch does not tile."""
    w, h = im.size
    out = im.copy()
    y1 = max(1, int(h * top_frac))
    left = im.crop((0, 0, blend, y1))
    right = im.crop((w - blend, 0, w, y1))
    for x in range(blend):
        t = (x + 0.5) / blend
        col = Image.blend(right.crop((x, 0, x + 1, y1)), left.crop((x, 0, x + 1, y1)), t)
        out.paste(col, (w - blend + x, 0))
    return out


def make_bump(albedo: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(albedo)
    hipass = Image.blend(gray, gray.filter(ImageFilter.GaussianBlur(radius=2.2)), 0.55)
    return ImageOps.autocontrast(hipass, cutoff=1)


def prepare_surface(van: Image.Image) -> None:
    w, h = van.size
    # Keep full width so the cylinder join is the real 360 wrap. Rover deck
    # starts ~26% down; inpaint any mast that still pokes into this band.
    # Stop above the rover deck / RSM mast that sit on the 360 join.
    band = van.crop((0, int(0.020 * h), w, int(0.232 * h)))
    band = inpaint_rover(band)
    # Horizon already wraps; blend only the sky/far hills so inpaint
    # in the near corners cannot stripe the join.
    band = blend_wrap_seam(band, blend=12, top_frac=0.62)
    save_jpeg(band, OUT / "jezero-horizon.jpg", (2048, max(1, round(2048 * band.size[1] / band.size[0]))), 88)

    gs = int(0.11 * h)
    x0 = int(0.42 * w)
    y0 = int(0.132 * h)
    van.crop((x0, y0, x0 + gs, y0 + gs)).resize((1536, 1536), Image.Resampling.LANCZOS).save(
        OUT / "jezero-ground.jpg", "JPEG", quality=76, optimize=True, progressive=True
    )


def prepare_globe(mdim: Image.Image) -> None:
    albedo = mdim.convert("RGB").resize((2048, 1024), Image.Resampling.LANCZOS)
    albedo.save(OUT / "mars-albedo.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    make_bump(albedo).save(OUT / "mars-bump.jpg", "JPEG", quality=82, optimize=True, progressive=True)


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    van_path = TMP / "PIA24663_orig.jpg"
    mdim_path = TMP / "mdim2k.jpg"
    download(PIA24663_URL, van_path)
    download(mdim_thumb_url(), mdim_path)

    prepare_surface(Image.open(van_path))
    prepare_globe(Image.open(mdim_path))

    leftover = (OUT / "jezero-delta.jpg", OUT / "jezero-climb.jpg")
    for path in leftover:
        if path.exists():
            path.unlink()

    print("wrote", sorted(p.name for p in OUT.glob("*.jpg")))


if __name__ == "__main__":
    main()
