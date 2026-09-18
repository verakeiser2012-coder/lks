# -*- coding: utf-8 -*-
"""Подвал плаката: вместо голого LEVKEYSER — адрес интерактивной карты и что там можно делать."""
import io
import os

T = os.path.dirname(os.path.abspath(__file__))


def sub(path, old, new):
    s = io.open(path, encoding="utf-8").read()
    assert old in s, "не найдено в %s: %s" % (os.path.basename(path), old[:60])
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))


i18n = os.path.join(T, "aroma_i18n.py")
sub(i18n, ' "file": "aroma_map_max",\n}',
    ' "online": ("levkeiser.com/aroma", " — интерактивная карта: наведите на любой материал, соберите свой состав и посмотрите, где он встанет"),\n'
    ' "file": "aroma_map_max",\n}')
sub(i18n, ' "file": "aroma_map_max_en",\n}',
    ' "online": ("levkeiser.com/aroma", " — the interactive map: hover any material, build your own blend and see where it lands"),\n'
    ' "file": "aroma_map_max_en",\n}')

mp = os.path.join(T, "aroma_map_max.py")
sub(mp,
    """svg.append('<text x="%.0f" y="%.0f" font-family="Roboto Slab" font-weight="700" font-size="26" letter-spacing="5" text-anchor="end" fill="%s">LEVKEYSER</text>' % (W-50, BY+34, MANE))""",
    """svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s"><tspan font-weight="700" fill="%s">%s</tspan>%s</text>'
           % (BY+140, INK, MANE, T["online"][0], T["online"][1]))""")
sub(mp,
    """f = fb(26); tw = dr.textlength("LEVKEYSER", font=f)
dr.text(((W-50)*k-tw, (BY+34-22)*k), "LEVKEYSER", font=f, fill=hexrgb(MANE))""",
    """f = fb(12.5); tw = dr.textlength(T["online"][0], font=f)
dr.text((50*k, (BY+140-10)*k), T["online"][0], font=f, fill=hexrgb(MANE))
dr.text((50*k+tw, (BY+140-10)*k), T["online"][1], font=fr(12.5), fill=ink)""")
print("плакат: адрес карты вместо логотипа")
