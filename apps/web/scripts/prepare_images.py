"""Crop, grade, and resize photos + logo for the public site."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ASSETS = Path(r"C:\Users\reine\.cursor\projects\c-Users-reine-o-naturel\assets")
OUT = Path(r"C:\Users\reine\o naturel\apps\web\public\images")
OUT.mkdir(parents=True, exist_ok=True)


def find(token: str) -> Path:
    matches = list(ASSETS.glob(f"*{token}*"))
    if not matches:
        raise FileNotFoundError(token)
    return matches[0]


def fit_box(im: Image.Image, width: int, height: int) -> Image.Image:
    src = im.convert("RGB")
    scale = max(width / src.width, height / src.height)
    resized = src.resize((max(1, round(src.width * scale)), max(1, round(src.height * scale))), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def save_jpg(im: Image.Image, name: str, size: tuple[int, int], quality: int = 82, crop: tuple[float, float, float, float] | None = None) -> None:
    work = im.convert("RGB")
    if crop:
        l, t, r, b = crop
        w, h = work.size
        work = work.crop((int(w * l), int(h * t), int(w * r), int(h * b)))
    work = fit_box(work, size[0], size[1])
    work = ImageEnhance.Contrast(work).enhance(1.06)
    work = ImageEnhance.Color(work).enhance(0.92)
    dest = OUT / name
    work.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"{name}: {dest.stat().st_size // 1024} kb {work.size}")


def prepare_logo(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pixels = im.load()
    w, h = im.size
    cx, cy = w / 2, h / 2
    radius = min(w, h) * 0.49
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist > radius:
                pixels[x, y] = (255, 255, 255, 0)
                continue
            # Lime disc → forest, leave vegetables and the name bar intact
            if g > r + 18 and g > b + 10 and r < 180:
                nr = int(r * 0.28 + 27 * 0.72)
                ng = int(g * 0.30 + 92 * 0.70)
                nb = int(b * 0.32 + 48 * 0.68)
                pixels[x, y] = (nr, ng, nb, 255)

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.thumbnail((320, 320), Image.Resampling.LANCZOS)
    dest = OUT / "logo.png"
    im.save(dest, "PNG", optimize=True)
    print(f"logo.png: {dest.stat().st_size // 1024} kb {im.size}")


def recompress_existing() -> None:
    for name, box in {
        "look-bio.png": (900, 1125),
        "look-spirit.png": (900, 1125),
        "look-savons.png": (1100, 825),
        "look-parfums.png": (1100, 825),
        "look-sacs.png": (1100, 825),
        "look-huiles.png": (1100, 825),
        "look-plantes.png": (1100, 825),
        "look-rituels.png": (1100, 825),
        "look-poudres.png": (1100, 825),
        "hero-nature.png": (1200, 900),
        "rituels-nature.png": (1100, 825),
    }.items():
        path = OUT / name
        if not path.exists():
            continue
        jpg_name = name.replace(".png", ".jpg")
        save_jpg(Image.open(path), jpg_name, box, quality=80)


def main() -> None:
    prepare_logo(find("B0AC10B8"))
    save_jpg(Image.open(find("DBA23AA5")), "maison-jars.jpg", (720, 960), crop=(0.04, 0.02, 0.96, 0.98))
    save_jpg(Image.open(find("7273028B")), "spirit-leaves.jpg", (720, 900), crop=(0.06, 0.04, 0.94, 0.96))
    save_jpg(Image.open(find("5198863A")), "spirit-water.jpg", (720, 900), crop=(0.08, 0.04, 0.92, 0.96))
    save_jpg(Image.open(find("DF27F8A5")), "atelier-fill.jpg", (900, 720), crop=(0.04, 0.18, 0.96, 0.92))
    save_jpg(Image.open(find("E19244E3")), "soin-savon.jpg", (720, 900), crop=(0.08, 0.05, 0.92, 0.95))
    save_jpg(Image.open(find("173A3975")), "atelier-serum.jpg", (900, 720), crop=(0.04, 0.12, 0.96, 0.82))
    save_jpg(Image.open(find("57068A66")), "savons-main.jpg", (800, 800), crop=(0.12, 0.08, 0.88, 0.92))
    save_jpg(Image.open(find("3E1F12BF")), "atelier-verse.jpg", (720, 900), crop=(0.08, 0.04, 0.92, 0.96))
    save_jpg(Image.open(find("F600D1C0")), "spirit-smudge.jpg", (720, 900), crop=(0.08, 0.04, 0.92, 0.96))
    recompress_existing()


if __name__ == "__main__":
    main()
