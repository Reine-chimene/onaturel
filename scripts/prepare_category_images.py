"""Prepare category visuals: crop, resize, WebP. Does not touch product photos."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public" / "images" / "categories"
ASSETS = Path.home() / ".cursor" / "projects" / "c-Users-reine-o-naturel" / "assets"
SRC = ROOT / "apps" / "web" / "public" / "images"

JOBS = [
    (SRC / "soin-savon.jpg", "classique.webp"),
    (SRC / "look-bio.jpg", "capillaires.webp"),
    (ASSETS / "cat-gommages-v2.png", "gommages.webp"),
    (ASSETS / "cat-diete.png", "diete.webp"),
    (SRC / "look-poudres.jpg", "divers.webp"),
    (SRC / "spirit-water.jpg", "spirituels.webp"),
    (SRC / "look-sacs.jpg", "sacs.webp"),
    (ASSETS / "cat-parfums.png", "parfums.webp"),
]

W, H = 1600, 1200


def cover(im: Image.Image, width: int, height: int) -> Image.Image:
    rgb = im.convert("RGB")
    scale = max(width / rgb.width, height / rgb.height)
    nw, nh = max(1, round(rgb.width * scale)), max(1, round(rgb.height * scale))
    rgb = rgb.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - width) // 2)
    top = max(0, (nh - height) // 2)
    return rgb.crop((left, top, left + width, top + height))


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for src, name in JOBS:
        if not src.exists():
            raise SystemExit(f"Missing {src}")
        out = PUBLIC / name
        cover(Image.open(src), W, H).save(out, "WEBP", quality=80, method=6)
        print(out.name, out.stat().st_size)


if __name__ == "__main__":
    main()
