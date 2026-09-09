/* Карта натуральных ароматов и верстак составов.
   Данные — /data/aroma-map.json (позиции те же, что на печатном плакате).
   Составы общие: /aroma/blends. Токен на удаление своей записи лежит в браузере. */
(function () {
  const root = document.getElementById('aroma');
  if (!root) return;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (n, a) => { const e = document.createElementNS(SVGNS, n); for (const k in (a || {})) e.setAttribute(k, a[k]); return e; };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let DATA = null, FAM = [], NODES = [], HUBS = [], lang = 'ru';
  const nm = (n) => n[lang];
  const famName = (f) => f[lang];

  const RU = {
    fit: 'Вписать', labels: 'Все подписи', lang: 'EN', q: 'найти аромат', save: 'Сохранить состав', copy: 'Скопировать',
    my: 'Мой состав', near: 'Похоже на', blends: 'Составы', fams: 'Семейства', clear: 'очистить',
    who: 'подпись', whoPh: 'кто собрал', shared: 'видны всем на этой странице',
    empty: 'Пока пусто. Соберите состав и нажмите «Сохранить».',
    hint: 'Колесо — приблизить, перетаскивание — сдвинуть. Клик по аромату кладёт его в состав.',
    start: 'Пусто. Кликните аромат на карте — он ляжет сюда. Части задают пропорцию: две части сандала на одну ладана.',
    mine: 'мой состав', saved: 'Сохранено', failSave: 'не удалось сохранить', failDel: 'удалить может только автор',
  };
  const EN = {
    fit: 'Fit', labels: 'All labels', lang: 'RU', q: 'find an aroma', save: 'Save blend', copy: 'Copy',
    my: 'My blend', near: 'Close to', blends: 'Blends', fams: 'Families', clear: 'clear',
    who: 'signed', whoPh: 'who made it', shared: 'visible to everyone on this page',
    empty: 'Nothing yet. Build a blend and press Save.',
    hint: 'Scroll to zoom, drag to pan. Click an aroma to drop it into the blend.',
    start: 'Empty. Click an aroma on the map to drop it here. Parts set the proportion: two parts sandalwood to one of frankincense.',
    mine: 'my blend', saved: 'Saved', failSave: 'could not save', failDel: 'only the author can delete',
  };
  const T = () => (lang === 'ru' ? RU : EN);

  /* ---------- доли ---------- */
  const wsum = (w) => Object.values(w).reduce((a, b) => a + b, 0);
  function shares(w) {
    const t = wsum(w) || 1;
    return Object.entries(w).map(([i, v]) => ({ i: +i, v: v / t })).sort((a, b) => b.v - a.v);
  }
  const secondary = (w) => shares(w).slice(1).filter((x) => x.v >= 0.2);
  function pie(w, r) {
    const g = el('g'), s = shares(w);
    if (s.length === 1) { g.appendChild(el('circle', { r: r, fill: FAM[s[0].i].c })); return g; }
    let a0 = -Math.PI / 2;
    for (const { i, v } of s) {
      const a1 = a0 + 2 * Math.PI * v, big = a1 - a0 > Math.PI ? 1 : 0;
      g.appendChild(el('path', {
        d: 'M0,0 L' + (r * Math.cos(a0)).toFixed(2) + ',' + (r * Math.sin(a0)).toFixed(2) +
           ' A' + r + ',' + r + ' 0 ' + big + ' 1 ' + (r * Math.cos(a1)).toFixed(2) + ',' + (r * Math.sin(a1)).toFixed(2) + ' Z',
        fill: FAM[i].c }));
      a0 = a1;
    }
    return g;
  }
  function pieCSS(w, px) {
    const s = shares(w);
    if (s.length === 1) return '<span class="ar-pie" style="display:inline-block;width:' + px + 'px;height:' + px + 'px;background:' + FAM[s[0].i].c + '"></span>';
    let acc = 0;
    const stops = s.map(({ i, v }) => { const a = acc, b = acc + v * 100; acc = b; return FAM[i].c + ' ' + a + '% ' + b + '%'; });
    return '<span class="ar-pie" style="display:inline-block;width:' + px + 'px;height:' + px + 'px;background:conic-gradient(' + stops.join(',') + ')"></span>';
  }

  /* ---------- карта ---------- */
  const svg = $('ar-map');
  let gRoot, gArcs, gHubs, gNodes, gBlend, nodeEls = [], hubLabels = [];
  let vx = 0, vy = 0, vz = 1, allLabels = false;

  function buildMap() {
    svg.setAttribute('viewBox', '0 0 ' + DATA.w + ' ' + DATA.h);
    gRoot = el('g'); gArcs = el('g'); gHubs = el('g'); gNodes = el('g'); gBlend = el('g');
    gRoot.appendChild(gArcs); gRoot.appendChild(gHubs); gRoot.appendChild(gNodes); gRoot.appendChild(gBlend);
    svg.appendChild(gRoot);

    for (const n of NODES) {
      for (const { i, v } of secondary(n.w)) {
        const h = HUBS[i], mx = (n.x + h[0]) / 2, my = (n.y + h[1]) / 2;
        gArcs.appendChild(el('path', {
          d: 'M' + n.x + ',' + n.y + ' Q' + (mx + (DATA.cx - mx) * 0.22).toFixed(1) + ',' + (my + (DATA.cy - my) * 0.22).toFixed(1) + ' ' + h[0] + ',' + h[1],
          class: 'ar-arc', stroke: FAM[i].c, 'stroke-width': (0.6 + 2.4 * v).toFixed(2), 'stroke-opacity': (0.35 + 0.45 * v).toFixed(2) }));
      }
    }
    HUBS.forEach((h, i) => {
      const g = el('g');
      g.appendChild(el('circle', { cx: h[0], cy: h[1], r: 30, class: 'ar-hub' }));
      g.appendChild(el('circle', { cx: h[0], cy: h[1], r: 12, fill: FAM[i].c }));
      const right = h[0] > DATA.cx + 1;
      const t = el('text', { x: h[0] + (right ? 44 : -44), y: h[1] + 6, class: 'ar-hubname', 'text-anchor': right ? 'start' : 'end' });
      t.textContent = famName(FAM[i]);
      g.appendChild(t); hubLabels.push(t); gHubs.appendChild(g);
    });
    nodeEls = NODES.map((n, idx) => {
      const g = el('g');
      g.appendChild(el('circle', { cx: n.x, cy: n.y, r: 6.4, fill: 'var(--ar-paper)' }));
      const p = pie(n.w, 5.2); p.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')'); g.appendChild(p);
      const label = el('text', { x: n.x, y: n.y + 17, class: 'ar-label', 'text-anchor': 'middle' });
      label.textContent = nm(n); g.appendChild(label);
      const hit = el('circle', { cx: n.x, cy: n.y, r: 13, fill: 'transparent', class: 'ar-hit' });
      hit.addEventListener('pointerenter', (e) => showTip(n, e));
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('click', () => add(idx));
      g.appendChild(hit); gNodes.appendChild(g);
      return { g: g, label: label, node: n };
    });
    apply();
  }

  function apply() {
    gRoot.setAttribute('transform', 'translate(' + vx + ',' + vy + ') scale(' + vz + ')');
    const show = allLabels || vz >= 1.45;
    for (const o of nodeEls) {
      if (!o.g.classList.contains('ar-keep')) o.label.style.opacity = show ? 1 : 0;
      o.label.style.fontSize = (11 / Math.max(1, vz * 0.55)).toFixed(1) + 'px';
    }
  }
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect(), s = DATA.w / r.width;
    const mx = (e.clientX - r.left) * s, my = (e.clientY - r.top) * s;
    const nz = Math.min(6, Math.max(1, vz * Math.exp(-e.deltaY * 0.0016)));
    vx = mx - (mx - vx) * (nz / vz); vy = my - (my - vy) * (nz / vz); vz = nz;
    if (vz === 1) { vx = 0; vy = 0; }
    apply();
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: vx, vy: vy }; svg.classList.add('ar-drag'); svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), s = DATA.w / r.width;
    vx = drag.vx + (e.clientX - drag.x) * s; vy = drag.vy + (e.clientY - drag.y) * s; apply();
  });
  const endDrag = () => { drag = null; svg.classList.remove('ar-drag'); };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  $('ar-fit').addEventListener('click', () => { vx = 0; vy = 0; vz = 1; apply(); });
  $('ar-labels').addEventListener('click', (e) => { allLabels = !allLabels; e.currentTarget.setAttribute('aria-pressed', String(allLabels)); apply(); });

  const tip = $('ar-tip');
  function showTip(n, ev) {
    tip.innerHTML = '<div class="tn">' + esc(nm(n)) + '</div><div class="tl">' + esc(lang === 'ru' ? n.en : n.ru) + '</div>' +
      shares(n.w).map(({ i, v }) =>
        '<div class="ar-frow"><span class="ar-sw" style="background:' + FAM[i].c + '"></span>' +
        '<span class="ar-bar"><i style="width:' + (v * 100).toFixed(0) + '%;background:' + FAM[i].c + '"></i></span>' +
        '<span style="font-size:11px;font-variant-numeric:tabular-nums">' + (v * 100).toFixed(0) + '%</span></div>' +
        '<div style="font-size:11px;color:var(--ar-soft);margin-left:20px">' + esc(famName(FAM[i])) + '</div>').join('');
    const pane = svg.parentElement.getBoundingClientRect();
    tip.classList.add('on');
    let x = ev.clientX - pane.left + 16, y = ev.clientY - pane.top + 14;
    if (x + tip.offsetWidth > pane.width - 8) x = ev.clientX - pane.left - tip.offsetWidth - 16;
    if (y + tip.offsetHeight > pane.height - 8) y = pane.height - tip.offsetHeight - 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => tip.classList.remove('on');

  $('ar-q').addEventListener('input', (e) => {
    const s = e.target.value.trim().toLowerCase();
    for (const o of nodeEls) {
      const hit = !s || o.node.ru.toLowerCase().indexOf(s) >= 0 || o.node.en.toLowerCase().indexOf(s) >= 0;
      o.g.classList.toggle('ar-dim', !!s && !hit);
      o.g.classList.toggle('ar-keep', !!s && hit);
      o.label.style.opacity = (!!s && hit) ? 1 : (allLabels || vz >= 1.45 ? 1 : 0);
    }
    gArcs.classList.toggle('ar-dim', !!s);
  });

  /* ---------- состав ---------- */
  let blend = new Map(), saved = [], note = '';
  const LS_WHO = 'aroma-author', LS_TOK = 'aroma-tokens';
  let author = '';
  try { author = localStorage.getItem(LS_WHO) || ''; } catch (e) {}
  const tokens = () => { try { return JSON.parse(localStorage.getItem(LS_TOK)) || {}; } catch (e) { return {}; } };
  const putToken = (id, t) => { try { const m = tokens(); m[id] = t; localStorage.setItem(LS_TOK, JSON.stringify(m)); } catch (e) {} };

  const add = (i, p) => { blend.set(i, (blend.get(i) || 0) + (p || 1)); render(); };
  const setParts = (i, v) => { if (v <= 0) blend.delete(i); else blend.set(i, v); render(); };

  function blendVector() {
    const v = {}; let tot = 0;
    for (const [i, p] of blend) {
      const w = NODES[i].w, s = wsum(w) || 1;
      for (const k in w) v[k] = (v[k] || 0) + (w[k] / s) * p;
      tot += p;
    }
    for (const k in v) v[k] /= (tot || 1);
    return v;
  }
  function nearest(vec, k) {
    const norm = (o) => Math.sqrt(Object.values(o).reduce((a, b) => a + b * b, 0)) || 1;
    const nv = norm(vec);
    return NODES.map((n, i) => {
      const s = wsum(n.w) || 1; let dot = 0; const un = {};
      for (const key in n.w) { un[key] = n.w[key] / s; dot += un[key] * (vec[key] || 0); }
      return { i: i, sim: dot / (norm(un) * nv) };
    }).filter((x) => !blend.has(x.i)).sort((a, b) => b.sim - a.sim).slice(0, k || 4);
  }
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b === 1) return f[0]; if (b >= 2 && b <= 4) return f[1]; return f[2]; };

  function render() {
    const t = T(), rowsBox = $('ar-rows');
    if (!blend.size) {
      rowsBox.innerHTML = '<p class="ar-empty">' + t.start + '</p>';
    } else {
      let h = '<div class="ar-rows">';
      for (const [i, p] of blend) {
        h += '<div class="ar-row"><span class="ar-nm">' + pieCSS(NODES[i].w, 15) + '<b>' + esc(nm(NODES[i])) + '</b></span>' +
             '<span class="ar-step"><button type="button" data-m="' + i + '" aria-label="меньше">&minus;</button>' +
             '<span class="ar-val">' + p + '</span><button type="button" data-p="' + i + '" aria-label="больше">+</button>' +
             '<button type="button" class="ar-kill" data-x="' + i + '" aria-label="убрать">&times;</button></span></div>';
      }
      rowsBox.innerHTML = h + '</div>';
    }
    $('ar-clear').hidden = !blend.size;
    const has = blend.size > 0;
    $('ar-total').hidden = !has; $('ar-acts').hidden = !has; $('ar-nearWrap').hidden = !has;
    if (has) {
      const vec = blendVector(), s = shares(vec), parts = Array.from(blend.values()).reduce((a, b) => a + b, 0);
      $('ar-parts').textContent = lang === 'ru'
        ? blend.size + ' ' + plural(blend.size, ['аромат', 'аромата', 'ароматов']) + ' · ' + parts + ' ' + plural(parts, ['часть', 'части', 'частей'])
        : blend.size + ' aromas · ' + parts + ' parts';
      $('ar-stack').innerHTML = s.map(({ i, v }) => '<i style="width:' + (v * 100).toFixed(2) + '%;background:' + FAM[i].c + '"></i>').join('');
      $('ar-tags').innerHTML = s.filter((x) => x.v >= 0.06).map(({ i, v }) => '<span class="ar-tag"><b>' + esc(famName(FAM[i])) + '</b> ' + (v * 100).toFixed(0) + '%</span>').join('');
      $('ar-near').innerHTML = nearest(vec).map(({ i, sim }) => '<button type="button" data-add="' + i + '">' + esc(nm(NODES[i])) + ' <span style="color:var(--ar-soft);font-variant-numeric:tabular-nums">' + (sim * 100).toFixed(0) + '%</span></button>').join('');
      drawBlend(vec);
    } else drawBlend(null);
    renderSaved();
  }

  function drawBlend(vec) {
    if (!gBlend) return;
    while (gBlend.firstChild) gBlend.removeChild(gBlend.firstChild);
    if (!vec) return;
    const sh = {}; let tot = 0;
    for (const k in vec) { sh[k] = Math.pow(vec[k], 1.7); tot += sh[k]; }
    let x = DATA.cx, y = DATA.cy;
    for (const k in sh) { x += sh[k] / tot * (HUBS[k][0] - DATA.cx) * 0.94; y += sh[k] / tot * (HUBS[k][1] - DATA.cy) * 0.94; }
    for (const { i, v } of shares(vec)) {
      if (v < 0.12) continue;
      const h = HUBS[i], mx = (x + h[0]) / 2, my = (y + h[1]) / 2;
      gBlend.appendChild(el('path', {
        d: 'M' + x + ',' + y + ' Q' + (mx + (DATA.cx - mx) * 0.22) + ',' + (my + (DATA.cy - my) * 0.22) + ' ' + h[0] + ',' + h[1],
        class: 'ar-arc', stroke: FAM[i].c, 'stroke-width': (1.4 + 3 * v).toFixed(2), 'stroke-opacity': 0.9, 'stroke-dasharray': '7 6' }));
    }
    gBlend.appendChild(el('circle', { cx: x, cy: y, r: 17, fill: 'none', stroke: 'var(--ar-ink)', 'stroke-width': 1.6, 'stroke-opacity': 0.55 }));
    gBlend.appendChild(el('circle', { cx: x, cy: y, r: 11.5, fill: 'var(--ar-paper)' }));
    const p = pie(vec, 10); p.setAttribute('transform', 'translate(' + x + ',' + y + ')'); gBlend.appendChild(p);
    const t = el('text', { x: x, y: y + 30, class: 'ar-hubname', 'text-anchor': 'middle', 'font-size': 15 });
    t.textContent = T().mine; gBlend.appendChild(t);
  }

  /* ---------- общие составы ---------- */
  function loadBlends() {
    return fetch('/aroma/blends', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((list) => { saved = Array.isArray(list) ? list : []; renderSaved(); })
      .catch(() => { note = lang === 'ru' ? 'список недоступен' : 'list unavailable'; renderSaved(); });
  }
  function renderSaved() {
    const t = T(), box = $('ar-saved'), mine = tokens();
    $('ar-note').textContent = note || t.shared;
    const who = $('ar-who');
    if (who.value !== author) who.value = author;
    box.innerHTML = saved.length
      ? saved.map((v) => '<div class="ar-s"><button type="button" class="open" data-open="' + v.id + '">' + esc(v.name) + '</button>' +
          (v.author ? '<span class="by">' + esc(v.author) + '</span>' : '') +
          '<span class="cnt">' + (v.items || []).length + '</span>' +
          (mine[v.id] ? '<button type="button" class="del" data-del="' + v.id + '" aria-label="удалить">&times;</button>' : '') +
          '</div>').join('')
      : '<p class="ar-empty" style="padding:6px 0">' + t.empty + '</p>';
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.p) setParts(+d.p, (blend.get(+d.p) || 0) + 1);
    else if (d.m) setParts(+d.m, (blend.get(+d.m) || 0) - 1);
    else if (d.x) setParts(+d.x, 0);
    else if (d.add) add(+d.add);
    else if (d.open) {
      const src = saved.find((v) => String(v.id) === d.open);
      if (src) { blend = new Map((src.items || []).map((o) => [o.i, o.p])); render(); }
    } else if (d.del) {
      const m = tokens();
      fetch('/aroma/blends/' + d.del, { method: 'DELETE', headers: { 'X-Blend-Token': m[d.del] || '' } })
        .then((r) => r.json())
        .then((j) => { if (!j.ok) { note = T().failDel; } loadBlends(); })
        .catch(() => { note = T().failDel; renderSaved(); });
    }
  });
  $('ar-clear').addEventListener('click', () => { blend.clear(); render(); });
  $('ar-who').addEventListener('input', (e) => {
    author = e.target.value.trim();
    try { localStorage.setItem(LS_WHO, author); } catch (err) {}
  });
  $('ar-save').addEventListener('click', () => {
    if (!blend.size) return;
    const name = Array.from(blend.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => nm(NODES[i])).join(' + ') +
      (blend.size > 2 ? ' +' + (blend.size - 2) : '');
    const btn = $('ar-save'), was = btn.textContent;
    btn.disabled = true;
    fetch('/aroma/blends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, author: author, items: Array.from(blend.entries()).map(([i, p]) => ({ i: i, p: p })) }),
    }).then((r) => r.json()).then((j) => {
      if (j && j.ok) {
        if (j.id && j.token) putToken(j.id, j.token);
        note = ''; btn.textContent = T().saved;
        setTimeout(() => { btn.textContent = was; btn.disabled = false; }, 1300);
        loadBlends();
      } else { note = (j && j.error) || T().failSave; btn.textContent = was; btn.disabled = false; renderSaved(); }
    }).catch(() => { note = T().failSave; btn.textContent = was; btn.disabled = false; renderSaved(); });
  });
  $('ar-copy').addEventListener('click', () => {
    const vec = blendVector();
    const txt = Array.from(blend.entries()).map(([i, p]) => nm(NODES[i]) + ' — ' + p).join('\n') + '\n\n' +
      shares(vec).filter((x) => x.v >= 0.06).map(({ i, v }) => famName(FAM[i]) + ' ' + (v * 100).toFixed(0) + '%').join(' · ');
    const btn = $('ar-copy'), was = btn.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => { btn.textContent = T().saved; setTimeout(() => { btn.textContent = was; }, 1300); })
      .catch(() => {});
  });

  /* ---------- язык ---------- */
  $('ar-lang').addEventListener('click', () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    const t = T();
    $('ar-fit').textContent = t.fit; $('ar-labels').textContent = t.labels; $('ar-lang').textContent = t.lang;
    $('ar-q').placeholder = t.q; $('ar-save').textContent = t.save; $('ar-copy').textContent = t.copy;
    $('ar-hint').textContent = t.hint; $('ar-clear').textContent = t.clear;
    $('ar-who').placeholder = t.whoPh;
    root.querySelector('.ar-who span').textContent = t.who;
    const titles = [t.my, t.near, t.blends, t.fams];
    root.querySelectorAll('.ar-sec').forEach((box, i) => {
      const first = box.querySelector('span');
      if (first && titles[i]) first.textContent = titles[i];
    });
    hubLabels.forEach((n, i) => { n.textContent = famName(FAM[i]); });
    nodeEls.forEach((o) => { o.label.textContent = nm(o.node); });
    drawLegend(); render();
  });
  function drawLegend() {
    $('ar-legend').innerHTML = FAM.map((f) => '<div><span class="ar-sw" style="background:' + f.c + '"></span><span>' + esc(famName(f)) + '</span></div>').join('');
  }

  /* ---------- старт ---------- */
  fetch('/data/aroma-map.json').then((r) => r.json()).then((d) => {
    DATA = d; FAM = d.families; NODES = d.nodes; HUBS = d.hubs;
    buildMap(); drawLegend();
    ['сандал', 'ладан', 'гималайский кедр'].forEach((n, k) => {
      const i = NODES.findIndex((x) => x.ru === n);
      if (i >= 0) blend.set(i, k === 0 ? 3 : k === 1 ? 2 : 1);
    });
    render();
    loadBlends();
  }).catch(() => {
    root.querySelector('.aroma-map-pane').innerHTML = '<p class="ar-empty" style="padding:24px">Карта не загрузилась. Обновите страницу.</p>';
  });
})();
