# -*- coding: utf-8 -*-
"""Состав можно отправить себе и в соцсети.

Три вещи: состав кодируется в адресе страницы (по устойчивым кодам ароматов),
кнопки соцсетей подставляют этот адрес, и состав рисуется картинкой 1080×1350
для ленты и сторис — картинкой делятся охотнее, чем ссылкой."""
import io

JS = r"C:\Users\User\Desktop\site\public\js\aroma.js"


def sub(a, b, path=JS):
    s = io.open(path, encoding="utf-8").read()
    assert a in s, "не найдено: " + a[:70]
    io.open(path, "w", encoding="utf-8").write(s.replace(a, b, 1))


# ---------------------------------------------------------------- код состава в адресе
sub("""  /* ---------- старт ---------- */""",
    """  /* ---------- состав в адресе ---------- */
  // ladan.4_labdanum.3 — код аромата и число частей. Коды устойчивы,
  // поэтому разосланные ссылки переживают обновление карты.
  function encodeBlend() {
    return [...blend.entries()]
      .map(([i, p]) => (NODES[i].id || i) + '.' + p)
      .join('_');
  }
  function decodeBlend(str) {
    const m = new Map();
    for (const part of String(str || '').split('_')) {
      const [id, p] = part.split('.');
      const i = NODES.findIndex((x) => x.id === id);
      const n = Math.max(1, Math.min(99, parseInt(p, 10) || 1));
      if (i >= 0) m.set(i, n);
    }
    return m;
  }
  function blendUrl() {
    const base = location.origin + location.pathname;
    return blend.size ? base + '?s=' + encodeBlend() : base;
  }
  function blendTitle() {
    if (!blend.size) return 'Карта натуральных ароматов';
    const top = [...blend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => nm(NODES[i]));
    return 'Мой состав: ' + top.join(', ') + (blend.size > 3 ? ' и ещё ' + (blend.size - 3) : '');
  }
  function syncShare() {
    const box = $('ar-share');
    if (!box) return;
    box.hidden = !blend.size;
    if (!blend.size) return;
    const u = encodeURIComponent(blendUrl()), t = encodeURIComponent(blendTitle());
    const set = (sel, href) => { const a = box.querySelector(sel); if (a) a.href = href; };
    set('[data-ar-tg]', 'https://t.me/share/url?url=' + u + '&text=' + t);
    set('[data-ar-vk]', 'https://vk.com/share.php?url=' + u + '&title=' + t);
    set('[data-ar-wa]', 'https://api.whatsapp.com/send?text=' + t + '%20' + u);
    set('[data-ar-ok]', 'https://connect.ok.ru/offer?url=' + u + '&title=' + t);
  }

  /* ---------- старт ---------- */""")

# перерисовка ссылок при каждом изменении состава
sub("""    } else drawBlend(null);
    renderSaved();""",
    """    } else drawBlend(null);
    syncShare();
    renderSaved();""")

# ---------------------------------------------------------------- кнопки
sub("""  $('ar-copy').addEventListener('click', () => {""",
    """  const shareBox = $('ar-share');
  if (shareBox) {
    const flash = (msg) => {
      const d = shareBox.querySelector('[data-ar-done]');
      if (!d) return;
      d.textContent = msg; d.hidden = false;
      clearTimeout(flash.t); flash.t = setTimeout(() => { d.hidden = true; }, 2200);
    };
    shareBox.querySelector('[data-ar-link]').addEventListener('click', () => {
      const url = blendUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => flash('Ссылка на состав скопирована'), () => flash(url));
      } else flash(url);
    });
    const nat = shareBox.querySelector('[data-ar-native]');
    if (nat && navigator.share) {
      nat.hidden = false;
      nat.addEventListener('click', () => {
        navigator.share({ title: blendTitle(), text: blendTitle(), url: blendUrl() }).catch(() => {});
      });
    }
    shareBox.querySelector('[data-ar-png]').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = 'sostav-' + (encodeBlend().slice(0, 40) || 'aromat') + '.png';
      a.href = blendCard();
      document.body.appendChild(a); a.click(); a.remove();
      flash('Картинка сохранена');
    });
  }

  /* Картинка состава для ленты и сторис: круговая диаграмма, список
     материалов с частями и полоса семейств. Целиком карту в этот размер
     не втиснуть — читаться не будет. */
  function blendCard() {
    const W = 1080, H = 1350, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#E4D8BE'; g.fillRect(0, 0, W, H);

    g.fillStyle = '#231B12';
    g.font = '600 34px "Roboto Slab", Georgia, serif';
    g.fillText('МОЙ СОСТАВ', 72, 108);
    g.fillStyle = '#6B5B45';
    g.font = '26px "IBM Plex Sans", system-ui, sans-serif';
    const parts = [...blend.values()].reduce((a, b) => a + b, 0);
    g.fillText(blend.size + ' ' + plural(blend.size, ['материал', 'материала', 'материалов'])
      + ' · ' + parts + ' ' + plural(parts, ['часть', 'части', 'частей']), 72, 150);

    // диаграмма
    const vec = blendVector(), sh = shares(vec);
    const cx = W / 2, cy = 430, r = 190;
    let a0 = -Math.PI / 2;
    for (const { i, v } of sh) {
      const a1 = a0 + 2 * Math.PI * v;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath();
      g.fillStyle = FAM[i].c; g.fill();
      a0 = a1;
    }
    g.beginPath(); g.arc(cx, cy, 92, 0, 2 * Math.PI); g.fillStyle = '#E4D8BE'; g.fill();

    // материалы
    let y = 700;
    g.font = '30px "IBM Plex Sans", system-ui, sans-serif';
    for (const [i, p] of [...blend.entries()].sort((a, b) => b[1] - a[1])) {
      const top = shares(NODES[i].w)[0].i;
      g.beginPath(); g.arc(86, y - 10, 11, 0, 2 * Math.PI); g.fillStyle = FAM[top].c; g.fill();
      g.fillStyle = '#231B12'; g.fillText(nm(NODES[i]), 116, y);
      g.fillStyle = '#6B5B45'; g.textAlign = 'right'; g.fillText(String(p), W - 72, y); g.textAlign = 'left';
      y += 46;
      if (y > 1120) break;
    }

    // полоса семейств
    const by = 1190, bh = 26;
    let x = 72;
    for (const { i, v } of sh) {
      const w = (W - 144) * v;
      g.fillStyle = FAM[i].c; g.fillRect(x, by, w, bh);
      x += w;
    }
    g.fillStyle = '#6B5B45';
    g.font = '24px "IBM Plex Sans", system-ui, sans-serif';
    g.fillText(sh.filter((s) => s.v >= 0.08).map((s) => famName(FAM[s.i]).toLowerCase()
      + ' ' + Math.round(s.v * 100) + '%').join(' · ').slice(0, 60), 72, by + 62);

    g.fillStyle = '#B4601C';
    g.font = '600 26px "Roboto Slab", Georgia, serif';
    g.textAlign = 'right'; g.fillText('levkeiser.com/aroma', W - 72, by + 62); g.textAlign = 'left';
    return c.toDataURL('image/png');
  }

  $('ar-copy').addEventListener('click', () => {""")

# ---------------------------------------------------------------- загрузка состава из адреса
sub("""    EXAMPLE.forEach(([n, parts]) => {
      const i = NODES.findIndex((x) => x.ru === n);
      if (i >= 0) blend.set(i, parts);
    });
    render();""",
    """    const fromUrl = new URLSearchParams(location.search).get('s');
    const shared = fromUrl ? decodeBlend(fromUrl) : null;
    if (shared && shared.size) {
      blend = shared;
      const ex = $('ar-example');
      if (ex) { ex.textContent = 'Открыт состав по ссылке. Меняйте части или нажмите «очистить», чтобы собрать своё.'; }
    } else {
      EXAMPLE.forEach(([n, parts]) => {
        const i = NODES.findIndex((x) => x.ru === n);
        if (i >= 0) blend.set(i, parts);
      });
    }
    render();""")

print("готово")
