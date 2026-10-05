"""Visuels de démonstration du guide d'utilisation (2026-10-04).

Produits et logo d'une boutique fictive, dessinés ici plutôt que pris en
ligne : aucun droit d'auteur, rendu sobre et cohérent sur les captures.
Usage : python3 scripts/guide/make_demo_images.py  (Pillow requis)
Sortie : public/guide/demo/*.png
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parents[2] / "public" / "guide" / "demo"
SIZE = 800


def font(size, bold=False):
    for name in (
        "/usr/share/fonts/google-noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/google-noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def background(top, bottom):
    img = Image.new("RGB", (SIZE, SIZE), top)
    d = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / SIZE
        d.line([(0, y), (SIZE, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))
    return img


def shadow(img, box, radius=40):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=(0, 0, 0, 70))
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    img.paste(layer, (0, 0), layer)


def label(d, box, text, color, text_color="white", size=34):
    d.rounded_rectangle(box, radius=14, fill=color)
    f = font(size, bold=True)
    lines = text.split("\n")
    total = sum(f.getbbox(line)[3] - f.getbbox(line)[1] + 8 for line in lines)
    y = (box[1] + box[3]) / 2 - total / 2
    for line in lines:
        w = f.getlength(line)
        d.text(((box[0] + box[2]) / 2 - w / 2, y), line, font=f, fill=text_color)
        y += f.getbbox(line)[3] - f.getbbox(line)[1] + 8


def dropper_bottle(name, glass, cap, tag, text, bg):
    img = background(*bg)
    shadow(img, (250, 640, 550, 720))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((300, 140, 500, 250), radius=30, fill=cap)          # pipette
    d.rectangle((330, 250, 470, 300), fill=cap)
    d.rounded_rectangle((250, 290, 550, 690), radius=60, fill=glass)          # flacon
    d.rounded_rectangle((268, 310, 300, 640), radius=16, fill=tuple(min(255, c + 45) for c in glass))
    label(d, (280, 420, 520, 580), text, tag)
    img.save(OUT / name)


def jar(name, body, lid, tag, text, bg):
    img = background(*bg)
    shadow(img, (190, 620, 610, 710))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((200, 250, 600, 330), radius=24, fill=lid)
    d.rounded_rectangle((190, 320, 610, 680), radius=50, fill=body)
    label(d, (240, 420, 560, 580), text, tag)
    img.save(OUT / name)


def soap(name, color, tag, text, bg):
    img = background(*bg)
    shadow(img, (170, 560, 630, 650))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((170, 320, 630, 600), radius=90, fill=color)
    d.rounded_rectangle((200, 340, 600, 420), radius=60, fill=tuple(min(255, c + 25) for c in color))
    f = font(52, bold=True)
    w = f.getlength(text)
    d.text((400 - w / 2, 455), text, font=f, fill=tag)
    img.save(OUT / name)


def pump(name, body, cap, tag, text, bg):
    img = background(*bg)
    shadow(img, (260, 650, 540, 730))
    d = ImageDraw.Draw(img)
    d.rectangle((385, 120, 415, 230), fill=cap)
    d.rounded_rectangle((330, 110, 470, 150), radius=14, fill=cap)
    d.rounded_rectangle((340, 220, 460, 270), radius=10, fill=cap)
    d.rounded_rectangle((260, 260, 540, 700), radius=50, fill=body)
    label(d, (285, 400, 515, 580), text, tag)
    img.save(OUT / name)


def pouch(name, fabric, stripe, bg):
    img = background(*bg)
    shadow(img, (160, 590, 640, 680))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((160, 260, 640, 640), radius=40, fill=fabric)
    for i, x in enumerate(range(160, 640, 60)):
        d.ellipse((x + 10, 300 + (i % 2) * 40, x + 50, 340 + (i % 2) * 40), fill=stripe)
        d.ellipse((x + 10, 420 + (i % 2) * 40, x + 50, 460 + (i % 2) * 40), outline=stripe, width=6)
        d.ellipse((x + 10, 540 - (i % 2) * 20, x + 50, 580 - (i % 2) * 20), fill=stripe)
    d.rectangle((160, 250, 640, 280), fill=(60, 40, 30))
    d.rounded_rectangle((380, 230, 420, 300), radius=8, fill=(200, 160, 60))
    img.save(OUT / name)


def logo():
    img = Image.new("RGB", (512, 512), (250, 243, 236))
    d = ImageDraw.Draw(img)
    d.ellipse((56, 56, 456, 456), fill=(122, 58, 42))
    d.ellipse((96, 96, 416, 416), outline=(232, 190, 120), width=6)
    f = font(150, bold=True)
    w = f.getlength("MA")
    d.text((256 - w / 2, 150), "MA", font=f, fill=(250, 243, 236))
    f2 = font(34, bold=True)
    w2 = f2.getlength("COSMÉTIQUES")
    d.text((256 - w2 / 2, 330), "COSMÉTIQUES", font=f2, fill=(232, 190, 120))
    img.save(OUT / "logo-maison-awa.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    cream = ((252, 246, 238), (240, 226, 210))
    green = ((238, 246, 236), (214, 232, 210))
    pink = ((252, 240, 242), (240, 216, 222))
    dropper_bottle("huile-ricin.png", (120, 70, 30), (30, 30, 30), (46, 125, 50), "HUILE DE\nRICIN", green)
    jar("beurre-karite.png", (245, 235, 215), (160, 110, 60), (160, 110, 60), "BEURRE DE\nKARITÉ", cream)
    soap("savon-noir.png", (60, 50, 45), (230, 210, 180), "SAVON NOIR", cream)
    pump("lait-corporel.png", (250, 250, 248), (190, 150, 90), (190, 150, 90), "LAIT\nCORPOREL", cream)
    jar("huile-coco.png", (250, 252, 250), (90, 160, 140), (90, 160, 140), "HUILE DE\nCOCO", green)
    jar("masque-avocat.png", (120, 160, 70), (60, 90, 40), (60, 90, 40), "MASQUE\nAVOCAT", green)
    jar("gommage-cafe.png", (110, 70, 45), (40, 30, 25), (200, 160, 110), "GOMMAGE\nCAFÉ", cream)
    pouch("trousse-wax.png", (230, 120, 30), (30, 80, 150), pink)
    logo()
    print("ok", sorted(p.name for p in OUT.iterdir()))
