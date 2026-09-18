// Знак «Печать», вторая редакция — та же геометрия, что в tools/mark_v2.py,
// но только SVG: Python на машине сейчас снесён, а вектор нужен и брендборду,
// и вышивальщику. Запуск: node tools/mark_v2.js → content/brand/mark-v2/*.svg
// и лист сравнения content/brand/mark-v2/compare.html.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'content', 'brand', 'mark-v2');
fs.mkdirSync(OUT, { recursive: true });

const MANE = '#B4601C';
const DUST = '#DCCBA0';
const RESIN = '#211A12';

function qbez(p0, p1, p2, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    out.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
      (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}
// Опорные точки (p0, c1, p1, c2, p2, …) → ломаная по квадратичным Безье.
function curve(pts) {
  let out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 2) out = out.concat(qbez(out[out.length - 1], pts[i], pts[i + 1]).slice(1));
  return out;
}

// ---------------------------------------------------------------- варианты (150×150)

function profile(mono) {
  const hair = mono ? DUST : MANE;
  const s = [['ring', 75, 75, 70, 3, DUST]];
  // лицо: лоб, нос с горбинкой, губы, подбородок — профиль монеты
  let face = curve([[60, 50], [57, 58], [56, 64], [59, 68], [50, 77], [48, 81], [57, 83], [55, 87], [56, 91], [55, 95], [62, 102], [70, 107], [78, 107]]);
  // короткая шея и широкие покатые плечи: бюст, а не ваза
  face = face.concat([[79, 118], [72, 122]]);
  face = face.concat(curve([[72, 122], [56, 126], [44, 134]]), [[42, 142], [110, 142]], curve([[110, 142], [108, 130], [96, 122]]));
  face = face.concat([[93, 118], [93, 106]]);
  face = face.concat(curve([[93, 106], [100, 92], [99, 74], [100, 60], [92, 46], [84, 36], [72, 36], [62, 42], [60, 50]]));
  s.push(['poly', face, DUST]);
  const curls = [[64, 44, 10], [74, 35, 12], [87, 33, 12], [98, 40, 11], [104, 52, 10], [104, 66, 9], [100, 79, 8],
    [57, 55, 8], [62, 34, 8], [94, 28, 8], [108, 44, 7], [52, 64, 6], [107, 76, 6]];
  for (const [cx, cy, r] of curls) {
    s.push(['circle', cx, cy, r, hair]);
    // одной нитью кудри отделяются от лица тонким просветом, как стежки
    if (mono) s.push(['ring', cx, cy, r, 1.5, RESIN]);
  }
  // наушники: чашка на ухе, дуга поверх копны
  s.push(['stroke', curve([[92, 64], [112, 36], [86, 20], [72, 18], [58, 28]]), 4, DUST]);
  s.push(['circle', 90, 72, 9, RESIN]);
  s.push(['ring', 90, 72, 9, 3, DUST]);
  return s;
}

function front() {
  const s = [['ring', 75, 75, 70, 3, DUST]];
  s.push(['poly', curve([[75, 40], [50, 40], [50, 68], [50, 90], [75, 100], [100, 90], [100, 68], [100, 40], [75, 40]]), DUST]);
  s.push(['poly', [[68, 98], [82, 98], [84, 116], [66, 116]], DUST]);
  s.push(['poly', curve([[66, 116], [60, 118], [46, 128]]).concat([[46, 142], [104, 142]], curve([[104, 142], [104, 128], [90, 118], [86, 117], [84, 116]])), DUST]);
  // грива: копна вокруг всего лица, до подбородка — как у Льва на самом деле
  const curls = [[50, 46, 11], [62, 36, 12], [75, 31, 13], [88, 36, 12], [100, 46, 11], [43, 60, 10], [107, 60, 10],
    [40, 76, 9], [110, 76, 9], [42, 91, 8], [108, 91, 8], [47, 103, 6], [103, 103, 6], [56, 30, 6], [94, 30, 6]];
  for (const [cx, cy, r] of curls) s.push(['circle', cx, cy, r, MANE]);
  // лицо поверх копны, чтобы кудри лежали вокруг, а не под ним
  s.push(['poly', curve([[75, 44], [54, 44], [53, 68], [52, 92], [75, 102], [98, 92], [97, 68], [96, 44], [75, 44]]), DUST]);
  s.push(['stroke', curve([[46, 70], [44, 26], [75, 18], [106, 26], [104, 70]]), 4, DUST]);
  for (const cx of [46, 104]) { s.push(['circle', cx, 76, 8, RESIN]); s.push(['ring', cx, 76, 8, 3, DUST]); }
  return s;
}

function old() {
  const s = [['ring', 75, 75, 70, 3, DUST], ['ring', 75, 75, 62, 1, '#7A7260']];
  let poly = [[45, 118]];
  for (const [a, b, c] of [[[45, 118], [45, 84], [55, 72]], [[55, 72], [48, 60], [52, 47]], [[52, 47], [56, 32], [75, 30]],
    [[75, 30], [94, 32], [98, 47]], [[98, 47], [102, 60], [95, 72]], [[95, 72], [105, 84], [105, 118]]]) poly = poly.concat(qbez(a, b, c).slice(1));
  s.push(['poly', poly, DUST]);
  for (const [cx, cy, r] of [[52, 38, 7], [65, 28, 8], [82, 26, 8], [96, 34, 7], [102, 47, 6]]) s.push(['circle', cx, cy, r, MANE]);
  const cupL = [[40, 62]].concat(qbez([40, 62], [40, 55], [47, 54]).slice(1), [[47, 74]], qbez([47, 74], [40, 73], [40, 66]).slice(1));
  const cupR = [[110, 62]].concat(qbez([110, 62], [110, 55], [103, 54]).slice(1), [[103, 74]], qbez([103, 74], [110, 73], [110, 66]).slice(1));
  for (const pts of [cupL, cupR]) { s.push(['poly', pts, RESIN]); s.push(['stroke', pts.concat([pts[0]]), 2, DUST]); }
  s.push(['stroke', qbez([44, 56], [75, 12], [106, 56]), 4, DUST]);
  return s;
}

// ---------------------------------------------------------------- SVG

function svg(shapes, bg = RESIN) {
  const f = (n) => Number(n).toFixed(1);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="${bg}"/>`];
  for (const sh of shapes) {
    if (sh[0] === 'poly') parts.push(`<polygon points="${sh[1].map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${sh[2]}"/>`);
    else if (sh[0] === 'circle') parts.push(`<circle cx="${sh[1]}" cy="${sh[2]}" r="${sh[3]}" fill="${sh[4]}"/>`);
    else if (sh[0] === 'ring') parts.push(`<circle cx="${sh[1]}" cy="${sh[2]}" r="${sh[3]}" fill="none" stroke="${sh[5]}" stroke-width="${sh[4]}"/>`);
    else if (sh[0] === 'stroke') parts.push(`<polyline points="${sh[1].map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${sh[3]}" stroke-width="${sh[2]}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

const variants = [
  ['old', 'Было: анфас', old()],
  ['profile', 'A. Профиль, две нити', profile(false)],
  ['profile-mono', 'B. Профиль, одна нить', profile(true)],
  ['front', 'C. Анфас, исправленный', front()],
];
const cards = [];
for (const [key, title, shapes] of variants) {
  const s = svg(shapes);
  fs.writeFileSync(path.join(OUT, `mark-${key}.svg`), s);
  cards.push(`<figure><div class="big">${s}</div><div class="small">${s}</div><figcaption>${title}</figcaption></figure>`);
  console.log('вариант:', key);
}
fs.writeFileSync(path.join(OUT, 'compare.html'), `<!doctype html><meta charset="utf-8"><title>Знак v2</title>
<style>body{margin:0;background:#96be96;font:16px 'Roboto Slab',Georgia,serif;padding:16px}
.row{display:flex;gap:20px}figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.big svg{width:300px;height:300px}.small svg{width:48px;height:48px}figcaption{font-size:15px}</style>
<div class="row">${cards.join('')}</div>`);
console.log('лист:', path.join(OUT, 'compare.html'));
