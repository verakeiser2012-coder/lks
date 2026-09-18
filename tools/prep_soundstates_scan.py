# -*- coding: utf-8 -*-
"""Скан коллажа Soundstates 1200 dpi → файлы для печати.

Вход: Pictures/2026-09-17_002.jpg (скан целиком, 10205 × 14032, 1200 dpi).
Выход в «музыка / Релизы / 2026 - Soundstates (EP) / Обложка»:
  Soundstates — скан 1200dpi 2026-09-17 (как есть).png       — кроп по краям коллажа, без правок
  Soundstates — скан 1200dpi 2026-09-17 (цвет под обложку).png — цвет на 70 % к официальной
                                                              обложке (Рейнхард в Lab) + без царапин

Царапины: длинные тонкие светлые линии на глянце коллажа. Ищем фильтром хребтов
(Sato, σ 1.5–3.5 px, светлые хребты), оставляем только вытянутые компоненты
(длина/ширина ≥ 5, длина ≥ 50 px), почти прямые (эксцентриситет ≥ 0.97), не толще
14 px (ответ фильтра шире самой царапины) и лежащие ±35° от горизонтали — царапины на скане идут вдоль хода каретки.
Без ограничения по углу маска цепляла контуры вырезок (бюст, плавники, рваные края).
Звёзды — компактные пятна, их не трогаем. Порог 6 подобран на фрагменте: 4 цепляет
зерно печати, 9 теряет короткие царапины. Закрашиваем медианой окружения 31 px.
Ответ фильтра хребтов кэшируется в scratchpad (_ridge_cand.npy) — считается ~10 мин.

Запуск: python tools/prep_soundstates_scan.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color, measure, filters

Image.MAX_IMAGE_PIXELS = None
SRC = os.path.join(os.path.expanduser("~"), "Pictures", "2026-09-17_002.jpg")
OUT = os.path.join(os.path.expanduser("~"), "Desktop", "музыка", "Релизы", "2026 - Soundstates (EP)", "Обложка")
OFFICIAL = os.path.join(OUT, "Soundstates — обложка 3000x3000.jpg")
RAW = os.path.join(OUT, "Soundstates — скан 1200dpi 2026-09-17 (как есть).png")
CLEAN = os.path.join(OUT, "Soundstates — скан 1200dpi 2026-09-17 (цвет под обложку).png")


def crop_collage(scan):
    k = 8
    sm = np.asarray(scan.resize((scan.width // k, scan.height // k))).astype(int)
    sat = sm.max(axis=2) - sm.min(axis=2)
    xs = np.where((sat > 25).mean(axis=0) > 0.3)[0]
    ys = np.where((sat > 25).mean(axis=1) > 0.3)[0]
    return scan.crop((xs[0] * k, ys[0] * k, (xs[-1] + 1) * k, (ys[-1] + 1) * k))


def match_colour(arr):
    off = np.asarray(Image.open(OFFICIAL).convert("RGB").resize((1000, 1000))) / 255.0
    small = np.asarray(Image.fromarray(arr).resize((1000, round(1000 * arr.shape[0] / arr.shape[1])))) / 255.0
    lab_off, lab_src = color.rgb2lab(off), color.rgb2lab(small)
    params = []
    for c in range(3):
        m_s, s_s = lab_src[..., c].mean(), lab_src[..., c].std()
        m_o, s_o = lab_off[..., c].mean(), lab_off[..., c].std()
        params.append((m_s, 1 + 0.7 * (s_o / s_s - 1), m_s + 0.7 * (m_o - m_s)))
    out = np.empty_like(arr)
    step = 1000
    for y in range(0, arr.shape[0], step):
        lab = color.rgb2lab(arr[y:y + step] / 255.0)
        for c, (m_s, kk, m_new) in enumerate(params):
            lab[..., c] = (lab[..., c] - m_s) * kk + m_new
        out[y:y + step] = np.clip(color.lab2rgb(lab) * 255, 0, 255).astype("uint8")
    return out


CACHE = os.path.join(os.environ.get("TEMP", "."), "soundstates_ridge_cand.npy")


def descratch(arr, thresh=6.0, min_len=50, min_elong=5.0, max_thick=14.0, max_angle=35.0,
              min_ecc=0.97, halo=3):
    """Возвращает (очищенный массив, маска царапин)."""
    H, W, _ = arr.shape
    L = arr.mean(axis=2).astype(np.float32)
    band, pad = 1200, 40
    if os.path.exists(CACHE):
        cand = np.load(CACHE)
    else:
        cand = np.zeros((H, W), bool)
        for y0 in range(0, H, band):
            a, b = max(0, y0 - pad), min(H, y0 + band + pad)
            ridge = filters.sato(L[a:b], sigmas=[1.5, 2.5, 3.5], black_ridges=False)
            s0 = y0 - a
            cand[y0:min(H, y0 + band)] = (ridge > thresh)[s0:s0 + min(H, y0 + band) - y0]
        np.save(CACHE, cand)
    lab, n = ndimage.label(cand)
    keep = np.zeros(n + 1, bool)
    stats = {"всего": n, "оставлено": 0}
    for r in measure.regionprops(lab):
        if r.axis_minor_length <= 0 or r.axis_major_length < min_len:
            continue
        if r.axis_major_length / r.axis_minor_length < min_elong or r.axis_minor_length > max_thick:
            continue
        if r.eccentricity < min_ecc:
            continue
        ang = abs(np.degrees(r.orientation))      # 0 = вертикаль в skimage
        if abs(90 - ang) > max_angle:
            continue
        keep[r.label] = True
        stats["оставлено"] += 1
    print("компонентов:", stats)
    mask = ndimage.binary_dilation(keep[lab], iterations=halo)
    out = arr.copy()
    for y0 in range(0, H, band):
        a, b = max(0, y0 - pad), min(H, y0 + band + pad)
        mt = mask[a:b]
        if not mt.any():
            continue
        s0 = y0 - a
        for c in range(3):
            med = ndimage.median_filter(arr[a:b, :, c], size=31)
            sub = out[y0:min(H, y0 + band), :, c]
            mm = mt[s0:s0 + sub.shape[0]]
            sub[mm] = med[s0:s0 + sub.shape[0]][mm]
    return out, mask


if __name__ == "__main__":
    scan = Image.open(SRC).convert("RGB")
    crop = crop_collage(scan)
    print("коллаж", crop.size, "= %.1f × %.1f см" % (crop.width / 1200 * 2.54, crop.height / 1200 * 2.54))
    crop.save(RAW)
    arr = np.asarray(crop)
    matched = match_colour(arr)
    clean, mask = descratch(matched)
    print("царапины: закрашено %.3f %% пикселей" % (100 * mask.mean()))
    Image.fromarray(clean).save(CLEAN)
    # контрольные фрагменты 1:1 и карта маски
    sm = Image.fromarray((mask * 255).astype("uint8")).resize((900, round(900 * mask.shape[0] / mask.shape[1])))
    sm.save(os.path.join(OUT, "_царапины-маска.png"))
    for name, im in (("before", matched), ("after", clean)):
        img = Image.fromarray(im)
        a = img.crop((600, 6800, 1800, 7700)); b = img.crop((6200, 4200, 7400, 5100))
        sh = Image.new("RGB", (2420, 900)); sh.paste(a, (0, 0)); sh.paste(b, (1220, 0))
        sh.save(os.path.join(OUT, "_контроль-%s.jpg" % name), quality=90)
    print("готово")
