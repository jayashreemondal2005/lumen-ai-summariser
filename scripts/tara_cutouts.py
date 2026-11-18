"""Cuts Tara's poses out of the AI-generated character sheet.

Usage: python scripts/tara_cutouts.py <path-to-tara-sheet.png>
Writes transparent WebP cut-outs and a circular avatar to public/tara/.
Requires: pip install rembg onnxruntime pillow
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "tara"
OUT.mkdir(parents=True, exist_ok=True)

# (name, box on the 1536x1024 sheet, output max height)
POSES = [
    ("tara-wave", (770, 0, 1125, 505), 560),
    ("tara-think", (1190, 0, 1510, 505), 560),
    ("tara-point", (430, 690, 770, 1024), 520),
    ("tara-bust", (785, 515, 1135, 1024), 560),
]


def trim(img: Image.Image, pad: int = 6) -> Image.Image:
    alpha = img.getchannel("A").point(lambda a: 255 if a > 24 else 0)
    box = alpha.getbbox()
    if not box:
        return img
    l, t, r, b = box
    return img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))


def clean_alpha(img: Image.Image) -> Image.Image:
    """Removes faint halo pixels left on the dark background."""
    r, g, b, a = img.split()
    a = a.point(lambda v: 0 if v < 28 else (255 if v > 235 else v))
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    return Image.merge("RGBA", (r, g, b, a))


def main(sheet_path: str) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    session = new_session("isnet-general-use")
    cut = {}
    for name, box, max_h in POSES:
        part = sheet.crop(box)
        out = remove(part, session=session, post_process_mask=True)
        out = trim(clean_alpha(out))
        scale = min(1.0, max_h / out.height)
        if scale < 1.0:
            out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
        out.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
        cut[name] = out
        print(f"{name}: {out.width}x{out.height}")

    # Circular avatar from the head-and-shoulders pose, on a soft brand-tinted disc.
    bust = cut["tara-bust"]
    size = 512
    c1, c2 = (226, 233, 253), (216, 243, 239)
    grad = Image.linear_gradient("L").resize((size, size)).rotate(45)
    disc = Image.composite(Image.new("RGBA", (size, size), c2 + (255,)), Image.new("RGBA", (size, size), c1 + (255,)), grad)
    scale = size * 1.06 / bust.width
    b = bust.resize((round(bust.width * scale), round(bust.height * scale)), Image.LANCZOS)
    disc.alpha_composite(b, ((size - b.width) // 2, round(size * 0.07)))
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    avatar = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    avatar.paste(disc, (0, 0), mask)
    avatar.resize((256, 256), Image.LANCZOS).save(OUT / "tara-avatar.webp", "WEBP", quality=90, method=6)
    avatar.resize((128, 128), Image.LANCZOS).save(OUT / "tara-avatar-128.webp", "WEBP", quality=90, method=6)
    print("tara-avatar: 256x256 and 128x128")


if __name__ == "__main__":
    main(sys.argv[1])
