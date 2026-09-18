# -*- coding: utf-8 -*-
"""Torn-paper caption plates in the style of the `soundstates` album cover:
a strip of warm off-white paper with a soft fibrous deckle edge, dark serif text on top.

Every plate is written as a full 1920x1080 transparent frame with the strip already in
position, so the CapCut segment needs no scaling or offset (scale 1.0, transform 0)."""
import os
from PIL import Image, ImageFilter
import numpy as np

OUT = r"C:\Users\User\Desktop\site\tools"
LOGO_BROWN = (r"C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-site"
              r"\cdfabed6-b3c5-435f-8fe6-cb2f593a630d\scratchpad\grusha_logo"
              r"\Основной логотип\Основной логотип\Коричневый\Коричневый основной.png")

PAPER = (243, 238, 227)     # warm off-white sheet
PAPER_HI = (252, 250, 245)  # raised fibre along the tear
INK = (26, 22, 18)


def contour(n, amp, seed):
    """Soft deckle profile: a couple of long waves plus gently smoothed jitter."""
    rnd = np.random.RandomState(seed)
    x = np.arange(n)
    prof = np.zeros(n)
    for wl, a in ((n/1.7, 1.0), (n/3.9, 0.5), (n/9.0, 0.22)):
        prof += a*np.sin(2*np.pi*x/wl + rnd.rand()*6.283)
    prof /= np.abs(prof).max()
    jit = rnd.randn(n)
    k = max(3, n//60) | 1
    ker = np.exp(-np.linspace(-2, 2, k)**2)
    ker /= ker.sum()
    jit = np.convolve(jit, ker, mode="same")
    jit /= (np.abs(jit).max() + 1e-9)
    return amp*(0.72*prof + 0.28*jit)


def strip(w, h, seed, amp=None):
    """RGBA strip of torn paper, w x h; the tear eats into all four edges."""
    amp = amp if amp is not None else max(3.0, h*0.035)
    ss = 3                                     # supersample for a clean anti-aliased tear
    W, H = w*ss, h*ss
    top = contour(W, amp*ss, seed) + amp*ss*1.25
    bot = contour(W, amp*ss, seed+404) + amp*ss*1.25
    lef = contour(H, amp*ss*0.7, seed+77) + amp*ss*0.9
    rig = contour(H, amp*ss*0.7, seed+55) + amp*ss*0.9
    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]
    m = ((yy >= top[None, :]) & (yy <= H-1-bot[None, :]) &
         (xx >= lef[:, None]) & (xx <= W-1-rig[:, None]))
    a = np.asarray(Image.fromarray((m*255).astype(np.uint8), "L").resize((w, h), Image.LANCZOS),
                   dtype=np.float32)

    rnd = np.random.RandomState(seed+9)
    g = rnd.randn(h, w)
    g = np.asarray(Image.fromarray(((g-g.min())/(g.max()-g.min())*255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32)
    g = (g-g.mean())/max(1e-6, g.std())
    rgb = np.zeros((h, w, 3), np.float32)
    rgb[:] = PAPER
    rgb += g[:, :, None]*3.0

    inner = np.asarray(Image.fromarray(a.astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(max(1.5, amp*0.8))), dtype=np.float32)
    fringe = np.clip((a-inner)/70.0, 0, 1)[:, :, None]
    rgb = rgb*(1-fringe) + np.array(PAPER_HI, np.float32)*fringe
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), a.astype(np.uint8)]), "RGBA")


def canvas_plate(w, h, cx, cy, seed, name, amp=None):
    c = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    s = strip(w, h, seed, amp)
    x, y = int(cx-w/2), int(cy-h/2)
    sh = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 115), (x+4, y+8), s.split()[3])
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    c.alpha_composite(s, (x, y))
    c.save(os.path.join(OUT, name))
    return c


def brown_logo(width):
    im = Image.open(LOGO_BROWN).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    alpha = np.clip((240-arr.mean(2))*(255/120.0), 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([np.asarray(im), alpha]), "RGBA")
    out = out.crop(Image.fromarray(alpha, "L").getbbox())
    return out.resize((width, int(out.height*width/out.width)), Image.LANCZOS)


if __name__ == "__main__":
    # lower-third caption strips; text centre sits at y = 875 px (transform y = -0.62)
    canvas_plate(1620, 190, 960, 875, 12, "plate_q1.png")
    canvas_plate(1620, 310, 960, 875, 34, "plate_q2.png")
    canvas_plate(1620, 420, 960, 875, 46, "plate_q3.png")
    # hero name strips, left / right
    canvas_plate(820, 290, 490, 875, 78, "plate_name_l.png")
    canvas_plate(820, 290, 1430, 875, 91, "plate_name_r.png")
    # credit block over the outtakes (lower left)
    canvas_plate(860, 330, 520, 830, 56, "plate_credit.png")
    # full card: a bigger sheet with the brown wordmark printed on it
    card = canvas_plate(1240, 600, 960, 540, 63, "plate_card.png", amp=9)
    lg = brown_logo(560)
    card.alpha_composite(lg, (960-lg.width//2, 340))
    card.save(os.path.join(OUT, "plate_card.png"))
    print("plates written")
