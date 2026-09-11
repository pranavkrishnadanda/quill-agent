"""Generate minimal indigo square PNG icons with a centered white 'J'.

Sizes: 16x16, 48x48, 128x128. Written to ../icons/ relative to this script.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

INDIGO = (79, 70, 229, 255)  # #4f46e5
WHITE = (255, 255, 255, 255)
SIZES = (16, 48, 128)

ICONS_DIR = Path(__file__).resolve().parent.parent / "icons"


def _load_font(px: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/gnu-free/FreeSansBold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, px)
            except OSError:
                continue
    return ImageFont.load_default()


def generate_icon(size: int, out_path: Path) -> None:
    img = Image.new("RGBA", (size, size), INDIGO)
    draw = ImageDraw.Draw(img)
    font = _load_font(int(size * 0.75))
    text = "J"
    try:
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        tw, th = right - left, bottom - top
        x = (size - tw) / 2 - left
        y = (size - th) / 2 - top
    except AttributeError:
        tw, th = draw.textsize(text, font=font)
        x = (size - tw) / 2
        y = (size - th) / 2
    draw.text((x, y), text, fill=WHITE, font=font)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)


def main() -> None:
    for size in SIZES:
        out = ICONS_DIR / f"icon{size}.png"
        generate_icon(size, out)
        print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
