#!/usr/bin/env python3
"""Crop and compress Mastcam-Z mosaics for the surface view.

NASA/JPL-Caltech/ASU/MSSS public-domain sources:
  PIA24921  https://photojournal.jpl.nasa.gov/catalog/PIA24921
  PIA24663  https://photojournal.jpl.nasa.gov/catalog/PIA24663
  PIA26378  https://photojournal.jpl.nasa.gov/catalog/PIA26378
"""

from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/nasa-mars")
OUT = ROOT / "src/assets/mars"

URLS = {
    "PIA24663": "https://images-assets.nasa.gov/image/PIA24663/PIA24663~orig.jpg",
    "PIA24921": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24921/PIA24921.jpg",
    "PIA26378": "https://images-assets.nasa.gov/image/PIA26378/PIA26378~orig.jpg",
}


def save_jpeg(im: Image.Image, path: Path, width: int, quality: int) -> None:
    h = max(1, round(width * im.size[1] / im.size[0]))
    im.resize((width, h), Image.Resampling.LANCZOS).save(
        path, "JPEG", quality=quality, optimize=True, progressive=True
    )


def main() -> None:
    van = TMP / "PIA24663_orig.jpg"
    delta = TMP / "PIA24921_full.jpg"
    climb = TMP / "PIA26378_orig.jpg"
    for path, url in (
        (van, URLS["PIA24663"]),
        (delta, URLS["PIA24921"]),
        (climb, URLS["PIA26378"]),
    ):
        if not path.exists():
            raise SystemExit(f"Download {url} to {path} first")

    im = Image.open(van)
    w, h = im.size
    save_jpeg(
        im.crop((int(0.12 * w), int(0.048 * h), int(0.968 * w), int(0.355 * h))),
        OUT / "jezero-horizon.jpg",
        2048,
        88,
    )

    d = Image.open(delta)
    w, h = d.size
    save_jpeg(
        d.crop((int(0.42 * w), int(0.02 * h), int(0.995 * w), int(0.58 * h))),
        OUT / "jezero-delta.jpg",
        2048,
        84,
    )
    gs = int(0.22 * h)
    d.crop((int(0.62 * w), int(0.28 * h), int(0.62 * w) + gs, int(0.28 * h) + gs)).resize(
        (1536, 1536), Image.Resampling.LANCZOS
    ).save(OUT / "jezero-ground.jpg", "JPEG", quality=74, optimize=True, progressive=True)

    c = Image.open(climb)
    w, h = c.size
    save_jpeg(
        c.crop((int(0.18 * w), int(0.10 * h), int(0.62 * w), int(0.48 * h))),
        OUT / "jezero-climb.jpg",
        2048,
        84,
    )
    print("wrote", list(OUT.glob("jezero-*.jpg")))


if __name__ == "__main__":
    main()
