# -*- coding: utf-8 -*-
"""Русская строка про интерактивную карту не влезала в левую колонку подвала и упиралась
в легенду. Разрешаем ей вторую строку; английская умещается в одну."""
import io
import os

T = os.path.dirname(os.path.abspath(__file__))


def sub(path, old, new):
    s = io.open(path, encoding="utf-8").read()
    assert old in s, "не найдено в %s: %s" % (os.path.basename(path), old[:60])
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))


sub(os.path.join(T, "aroma_i18n.py"),
    ' "online": ("levkeiser.com/aroma", " — интерактивная карта: наведите на любой материал, соберите свой состав и посмотрите, где он встанет"),',
    ' "online": ("levkeiser.com/aroma", " — интерактивная карта: наведите на любой материал,",\n'
    '            "соберите свой состав и посмотрите, где он встанет"),')

mp = os.path.join(T, "aroma_map_max.py")
sub(mp,
    """svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s"><tspan font-weight="700" fill="%s">%s</tspan>%s</text>'
           % (BY+140, INK, MANE, T["online"][0], T["online"][1]))""",
    """svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s"><tspan font-weight="700" fill="%s">%s</tspan>%s</text>'
           % (BY+140, INK, MANE, T["online"][0], T["online"][1]))
for n_, ln in enumerate(T["online"][2:]):
    svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s">%s</text>' % (BY+140+17*(n_+1), INK, ln))""")
sub(mp,
    """dr.text((50*k+tw, (BY+140-10)*k), T["online"][1], font=fr(12.5), fill=ink)""",
    """dr.text((50*k+tw, (BY+140-10)*k), T["online"][1], font=fr(12.5), fill=ink)
for n_, ln in enumerate(T["online"][2:]):
    dr.text((50*k, (BY+140+17*(n_+1)-10)*k), ln, font=fr(12.5), fill=ink)""")
print("вторая строка разрешена")
