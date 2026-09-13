#!/usr/bin/env python3
"""Crop and compress PIA24663 for the surface view. NASA/JPL-Caltech/ASU/MSSS."""

from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/tmp/nasa-mars/PIA24663_orig.jpg")
OUT = ROOT / "src/assets/mars"
ORIG_URL = "https://images-assets.nasa.gov/image/PIA24663/PIA24663~orig.jpg"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Download {ORIG_URL} to {SRC} first")
    im = Image.open(SRC)
    w, h = im.size
    # Skip rover hardware on the left/right; keep the landscape band.
    horizon = im.crop((int(0.12 * w), int(0.048 * h), int(0.968 * w), int(0.355 * h)))
    out_w = 2048
    out_h = max(1, round(out_w * horizon.size[1] / horizon.size[0]))
    horizon.resize((out_w, out_h), Image.Resampling.LANCZOS).save(
        OUT / "jezero-horizon.jpg",
        "JPEG",
        quality=88,
        optimize=True,
        progressive=True,
    )
    ground = im.crop((8634, 826, 8634 + 1680, 826 + 1680))
    ground.resize((1536, 1536), Image.Resampling.LANCZOS).save(
        OUT / "jezero-ground.jpg",
        "JPEG",
        quality=74,
        optimize=True,
        progressive=True,
    )
    print("wrote", OUT / "jezero-horizon.jpg", OUT / "jezero-ground.jpg")


if __name__ == "__main__":
    main()
