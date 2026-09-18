# -*- coding: utf-8 -*-
"""PDF карты ароматов из вектора (SVG) через Chrome headless: текст остаётся текстом,
шрифт Roboto Slab встраивается, линии не растрируются. Лист заданного формата,
карта (1400x1120 у себя) вписана по высоте и отцентрована, фон «пыль» на весь лист.

    python aroma_pdf_vector.py <svg> <pdf> <ширина мм> <высота мм> [заголовок]
"""
import os, sys, subprocess, tempfile, io

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DUST = "#DCCBA0"


def build(svg_path, pdf_path, pw, ph, title=""):
    svg = io.open(svg_path, encoding="utf-8").read()
    # размеры листа заданы CSS: сам svg масштабируем по высоте, ширина по пропорции 1400:1120
    mh = ph
    mw = ph * 1400.0 / 1120.0
    if mw > pw:
        mw = pw
        mh = pw * 1120.0 / 1400.0
    svg = svg.replace('width="1400mm" height="1120mm"', 'width="%.3fmm" height="%.3fmm"' % (mw, mh), 1)
    font_url = lambda f: "file:///" + os.path.join(FONTS, f).replace("\\", "/")
    html = """<!doctype html><html><head><meta charset="utf-8"><title>%s</title>
<style>
@font-face { font-family: 'Roboto Slab'; font-weight: 400; src: url('%s'); }
@font-face { font-family: 'Roboto Slab'; font-weight: 700; src: url('%s'); }
@page { size: %.2fmm %.2fmm; margin: 0; }
html, body { margin: 0; padding: 0; background: %s; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { width: %.2fmm; height: %.2fmm; display: flex; align-items: center; justify-content: center; overflow: hidden; }
svg { display: block; }
</style></head><body>%s</body></html>""" % (
        title, font_url("RobotoSlab-Regular.ttf"), font_url("RobotoSlab-Bold.ttf"), pw, ph, DUST, pw, ph, svg)
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(html); tmp.close()
    url = "file:///" + tmp.name.replace("\\", "/")
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
           "--user-data-dir=" + os.path.join(tempfile.gettempdir(), "chrome-pdf-profile"),
           "--virtual-time-budget=10000", "--print-to-pdf=" + pdf_path, url]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if not os.path.exists(pdf_path):
        raise SystemExit("Chrome не сделал PDF: " + (r.stderr or "")[-1500:])
    os.unlink(tmp.name)
    return os.path.getsize(pdf_path)


if __name__ == "__main__":
    svg, pdf, w, h = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    title = sys.argv[5] if len(sys.argv) > 5 else ""
    print(pdf, round(build(svg, pdf, w, h, title) / 1048576, 2), "Мб")
