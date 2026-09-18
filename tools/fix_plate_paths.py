# -*- coding: utf-8 -*-
"""Обложка и логотип переехали: обложка — в разобранную папку «Музыка», логотип — из временной
папки сессии в tools/, чтобы не пропасть вместе с ней."""
import io
import os
import re
import shutil

T = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "claude", "C--Users-User-Desktop-site",
                   "cdfabed6-b3c5-435f-8fe6-cb2f593a630d", "scratchpad", "grusha_logo")
dst = os.path.join(T, "grusha_logo")
if not os.path.isdir(dst):
    shutil.copytree(src, dst)
    print("логотип скопирован в tools/grusha_logo")

p = os.path.join(T, "make_plates2.py")
s = io.open(p, encoding="utf-8").read()
cover = os.path.join(os.path.expanduser("~"), "Desktop", "Музыка", "Релизы", "2026 - Soundstates (EP)",
                     "Обложка", "Soundstates — обложка 3000x3000.jpg")
assert os.path.exists(cover), cover
s, n1 = re.subn(r'^COVER = r".*"$', "COVER = r" + repr(cover)[1:], s, count=1, flags=re.M)
s, n2 = re.subn(r'^MARK = \(r".*"\n\s+r".*"\)$',
                'MARK = os.path.join(OUT, "grusha_logo", "Сокращенный знак", "Сокращенный знак", "Светлый", "СВетлый сокр..png")',
                s, count=1, flags=re.M)
s, n3 = re.subn(r'^WORDMARK = \(r".*"\n\s+r".*"\)$',
                'WORDMARK = os.path.join(OUT, "grusha_logo", "Основной логотип", "Основной логотип", "Светлый", "Светлый основной.png")',
                s, count=1, flags=re.M)
io.open(p, "w", encoding="utf-8").write(s)
print("заменено: cover %d, mark %d, wordmark %d" % (n1, n2, n3))
