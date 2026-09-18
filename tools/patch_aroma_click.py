# -*- coding: utf-8 -*-
"""Клик по аромату не срабатывал: захват указателя для перетаскивания уводил
событие на сам svg, и слушатель на кружке не вызывался. Теперь захват включается
только когда палец действительно поехал, а выбор происходит на отпускании."""
import io

p = r"C:\Users\User\Desktop\site\public\js\aroma.js"
s = io.open(p, encoding="utf-8").read()
n0 = len(s)


def sub(a, b):
    global s
    assert a in s, "не найдено: " + a[:60]
    s = s.replace(a, b, 1)


# индекс держим на самом кружке — по нему узнаём, куда кликнули
sub("""      const hit = el('circle', { cx: n.x, cy: n.y, r: 13, fill: 'transparent', class: 'ar-hit' });
      hit.addEventListener('pointerenter', (e) => showTip(n, e));
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('click', () => add(idx));""",
    """      const hit = el('circle', { cx: n.x, cy: n.y, r: 13, fill: 'transparent', class: 'ar-hit' });
      hit.dataset.i = idx;
      hit.addEventListener('pointerenter', (e) => showTip(n, e));
      hit.addEventListener('pointerleave', hideTip);""")

sub("""  let drag = null;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: vx, vy: vy }; svg.classList.add('ar-drag'); svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), s = DATA.w / r.width;
    vx = drag.vx + (e.clientX - drag.x) * s; vy = drag.vy + (e.clientY - drag.y) * s; apply();
  });
  const endDrag = () => { drag = null; svg.classList.remove('ar-drag'); };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);""",
    """  // Захват указателя переносит все события на svg, и клик по кружку теряется.
  // Поэтому захватываем только после того, как указатель уехал дальше порога,
  // а короткое нажатие без движения считаем выбором аромата.
  let drag = null;
  const MOVED = 4;
  svg.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, vx: vx, vy: vy, id: e.pointerId, moved: false,
             hit: e.target && e.target.classList.contains('ar-hit') ? e.target.dataset.i : null };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < MOVED) return;
      drag.moved = true;
      svg.classList.add('ar-drag');
      try { svg.setPointerCapture(drag.id); } catch (err) { /* указатель уже отпущен */ }
    }
    const r = svg.getBoundingClientRect(), s = DATA.w / r.width;
    vx = drag.vx + (e.clientX - drag.x) * s; vy = drag.vy + (e.clientY - drag.y) * s; apply();
  });
  const endDrag = (e) => {
    if (drag && !drag.moved && drag.hit != null) add(+drag.hit);
    if (drag && drag.moved) { try { svg.releasePointerCapture(drag.id); } catch (err) {} }
    drag = null; svg.classList.remove('ar-drag');
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', () => { drag = null; svg.classList.remove('ar-drag'); });""")

io.open(p, "w", encoding="utf-8").write(s)
print("было", n0, "стало", len(s))
