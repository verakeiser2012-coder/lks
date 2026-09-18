# -*- coding: utf-8 -*-
"""Карта открывается на составе таблетки «Груша × Лев».

Материалы взяты из карточки товара, пропорции — прикидка по порядку перечисления
(парфюмеры пишут от главного к деталям), поэтому в подписи так и сказано."""
import io

JS = r"C:\Users\User\Desktop\site\public\js\aroma.js"
EJS = r"C:\Users\User\Desktop\site\src\views\aroma.ejs"


def patch(path, old, new):
    s = io.open(path, encoding="utf-8").read()
    assert old in s, "не найдено в %s: %s" % (path, old[:60])
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))


# --- состав таблетки вместо случайной тройки
patch(JS, """    ['сандал', 'ладан', 'гималайский кедр'].forEach((n, k) => {
      const i = NODES.findIndex((x) => x.ru === n);
      if (i >= 0) blend.set(i, k === 0 ? 3 : k === 1 ? 2 : 1);
    });
    render();""",
      """    // Состав таблетки «Груша × Лев» — материалы из карточки товара.
    // Пропорции наши, по порядку перечисления: в подписи это оговорено.
    EXAMPLE.forEach(([n, parts]) => {
      const i = NODES.findIndex((x) => x.ru === n);
      if (i >= 0) blend.set(i, parts);
    });
    render();""")

patch(JS, "  /* ---------- старт ---------- */",
      """  /* ---------- старт ---------- */
  const EXAMPLE = [
    ['ладан', 4], ['лабданум', 3], ['амбра серая', 2], ['ваниль', 2],
    ['бобы тонка', 2], ['мускатный орех', 1], ['нероли', 1],
  ];
""")

# --- подпись: что именно загружено и почему пропорции примерные
patch(EJS, """      <div class="ar-sec"><span>Мой состав</span><button type="button" id="ar-clear" hidden>очистить</button></div>
      <div id="ar-rows"></div>""",
      """      <div class="ar-sec"><span>Мой состав</span><button type="button" id="ar-clear" hidden>очистить</button></div>
      <p class="ar-example" id="ar-example">Для примера загружен состав <a href="/catalog/aromaticheskaya-tabletka-grusha-lev">таблетки «Груша&nbsp;×&nbsp;Лев»</a>: материалы из карточки товара, пропорции примерные. Нажмите «очистить» и соберите своё.</p>
      <div id="ar-rows"></div>""")

patch(EJS, ".aroma-uses{list-style:none;",
      """.ar-example{margin:0 0 12px;font-size:12.5px;line-height:1.5;color:var(--ar-soft)}
.ar-example a{color:var(--ar-warm)}
.aroma-uses{list-style:none;""")

# подпись прячется, как только состав изменили
patch(JS, "  const add = (i, p) => { blend.set(i, (blend.get(i) || 0) + (p || 1)); render(); };",
      """  function hideExample() { const e = $('ar-example'); if (e) e.hidden = true; }
  const add = (i, p) => { hideExample(); blend.set(i, (blend.get(i) || 0) + (p || 1)); render(); };""")
patch(JS, "  const setParts = (i, v) => { if (v <= 0) blend.delete(i); else blend.set(i, v); render(); };",
      "  const setParts = (i, v) => { hideExample(); if (v <= 0) blend.delete(i); else blend.set(i, v); render(); };")

print("готово")
