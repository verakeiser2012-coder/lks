// Знак «Печать», художественная редакция: гравюра на монете, а не пиктограмма.
//
// Отличие от tools/mark_v2.js: там фигуры-заливки, здесь линия. Лицо в профиль
// с глазом, бровью и губами; кудри — настоящие завитки (спирали разной
// величины) на массе волос, а не кружки; наушник с объёмом; штриховка на
// скуле и шее, как режут штихелем; по ободу — надпись, как на монете.
// Палитра прежняя: Смола / Пыль / Грива.
// Запуск: node tools/mark_art.js → content/brand/mark-v2/mark-art*.svg + compare-art.html
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'content', 'brand', 'mark-v2');
fs.mkdirSync(OUT, { recursive: true });

const MANE = '#B4601C';
const MANE_DARK = '#7E3F12';
const MANE_LIGHT = '#D98A3E';
const DUST = '#DCCBA0';
const DUST_DIM = 'rgba(220,203,160,0.55)';
const RESIN = '#211A12';

const f = (n) => Number(n).toFixed(2);
const P = (pts) => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

// Спираль завитка: от края к центру, `turns` оборотов. Даёт полилинию.
function spiral(cx, cy, r0, turns = 1.6, phase = 0, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = phase + t * turns * 2 * Math.PI;
    const r = r0 * (1 - 0.82 * t);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function build({ withText = true, mono = false } = {}) {
  const hair = mono ? DUST : MANE;
  const hairDark = mono ? RESIN : MANE_DARK;
  const hairLight = mono ? DUST : MANE_LIGHT;
  const g = [];

  // фон и монетный обод: два кольца и насечка между ними
  g.push(`<rect width="150" height="150" fill="${RESIN}"/>`);
  g.push(`<circle cx="75" cy="75" r="71" fill="none" stroke="${DUST}" stroke-width="2.2"/>`);
  g.push(`<circle cx="75" cy="75" r="62" fill="none" stroke="${DUST}" stroke-width="0.8"/>`);
  if (withText) {
    g.push(`<defs><path id="rim" d="M 75 75 m -66.5 0 a 66.5 66.5 0 1 1 133 0 a 66.5 66.5 0 1 1 -133 0"/></defs>`);
    g.push(`<text font-family="'Roboto Slab',Rockwell,Georgia,serif" font-size="6.2" font-weight="700" letter-spacing="1.4" fill="${DUST}">`
      + `<textPath href="#rim" startOffset="2%">LEVKEYSER · SLOW IN A FAST WORLD · LEVKEYSER · SLOW IN A FAST WORLD ·</textPath></text>`);
  } else {
    // без текста — насечка по ободу, как гурт монеты
    const ticks = [];
    for (let i = 0; i < 72; i += 1) {
      const a = (i / 72) * 2 * Math.PI;
      ticks.push(`M${f(75 + 63.5 * Math.cos(a))} ${f(75 + 63.5 * Math.sin(a))} L${f(75 + 66 * Math.cos(a))} ${f(75 + 66 * Math.sin(a))}`);
    }
    g.push(`<path d="${ticks.join(' ')}" stroke="${DUST_DIM}" stroke-width="0.8"/>`);
  }

  // ---- масса волос (под всем остальным), тонкая тень по краю
  const hairMass = 'M 58 52 C 52 40, 60 26, 76 22 C 92 18, 108 26, 111 42 C 114 56, 110 70, 104 82 '
    + 'C 100 92, 98 98, 96 104 L 90 104 C 94 92, 98 80, 96 70 C 95 62, 92 58, 90 60 '
    + 'C 84 50, 74 46, 66 52 Z';
  g.push(`<path d="${hairMass}" fill="${hair}"/>`);

  // ---- лицо: лёгкая подложка тоном (иначе в 48 px остаётся одна копна), затем контур
  g.push(`<path d="M 62 50 C 58 56, 56 62, 57 66 C 60 67, 58 70, 56 72 C 53 75, 50 78, 49 80 C 50 82, 54 82, 56 83 C 55 85, 54 87, 55 88 C 58 89, 58 90, 55 92 C 56 94, 57 95, 56 96 C 59 99, 62 102, 66 104 C 70 106, 74 107, 78 108 C 80 114, 80 120, 79 126 L 92 110 C 94 96, 92 76, 90 60 C 84 50, 74 46, 66 52 Z" fill="${DUST}" opacity="0.16"/>`);
  const face = 'M 62 50 C 58 56, 56 62, 57 66 C 60 67, 58 70, 56 72 C 53 75, 50 78, 49 80 '
    + 'C 50 82, 54 82, 56 83 C 55 85, 54 87, 55 88 C 58 89, 58 90, 55 92 C 56 94, 57 95, 56 96 '
    + 'C 59 99, 62 102, 66 104 C 70 106, 74 107, 78 108 C 80 114, 80 120, 79 126';
  g.push(`<path d="${face}" fill="none" stroke="${DUST}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`);
  // ноздря и уголок рта — две короткие линии, без них профиль плоский
  g.push(`<path d="M 53 80 C 55 80, 56 81, 56 82" fill="none" stroke="${DUST}" stroke-width="1.4" stroke-linecap="round"/>`);
  g.push(`<path d="M 57 90 C 60 90, 62 89, 64 89" fill="none" stroke="${DUST_DIM}" stroke-width="1.2" stroke-linecap="round"/>`);
  // бровь и глаз
  g.push(`<path d="M 58 61 C 62 58, 68 58, 72 60" fill="none" stroke="${DUST}" stroke-width="2" stroke-linecap="round"/>`);
  g.push(`<path d="M 60 68 C 63 65, 67 65, 70 67 C 67 69, 63 70, 60 68 Z" fill="${DUST}"/>`);
  g.push(`<circle cx="65" cy="67.4" r="1.4" fill="${RESIN}"/>`);
  // тень под скулой — три коротких штриха; больше — и четырнадцатилетний стареет
  g.push(`<path d="M 66 92 L 72 98 M 69 91 L 75 97 M 72 90 L 78 96" stroke="${DUST_DIM}" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>`);

  // ---- шея и плечи: линия воротника, штриховка вниз в пустоту (гравюра «в обрез»)
  g.push(`<path d="M 79 126 C 70 128, 58 132, 48 138" fill="none" stroke="${DUST}" stroke-width="2" stroke-linecap="round"/>`);
  g.push(`<path d="M 92 110 C 95 118, 100 126, 108 134" fill="none" stroke="${DUST}" stroke-width="2" stroke-linecap="round"/>`);
  const neck = [];
  for (let i = 0; i < 9; i += 1) neck.push(`M ${f(82 + i * 1.3)} ${f(112 + i * 1.2)} L ${f(90 + i * 0.6)} ${f(126 + i * 1.6)}`);
  g.push(`<path d="${neck.join(' ')}" stroke="${DUST_DIM}" stroke-width="0.9" stroke-linecap="round"/>`);
  const shoulder = [];
  for (let i = 0; i < 12; i += 1) shoulder.push(`M ${f(54 + i * 4.5)} ${f(138 - Math.abs(i - 6) * 0.5)} L ${f(54 + i * 4.5)} ${f(146)}`);
  g.push(`<path d="${shoulder.join(' ')}" stroke="${DUST_DIM}" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>`);

  // ---- линия волос над лбом и виском (граница массы, чтобы лицо «сидело» под кудрями)
  g.push(`<path d="M 62 50 C 66 46, 72 44, 78 46 M 90 60 C 92 66, 94 72, 92 78" fill="none" stroke="${hairDark}" stroke-width="1.6" stroke-linecap="round"/>`);

  // ---- завитки: крупные по краю копны, мелкие к лицу; тёмный виток + светлый блик
  const curls = [
    [64, 36, 9, 0.2], [78, 28, 10, 1.1], [94, 30, 9, 2.3], [106, 42, 8, 0.6], [108, 58, 7, 1.7],
    [104, 74, 6.5, 2.8], [100, 90, 6, 0.9], [70, 46, 6, 2.0], [86, 42, 7, 0.4], [98, 50, 6, 1.5],
    [90, 64, 5.5, 2.6], [58, 46, 5, 1.2], [96, 78, 5, 0.3], [82, 56, 4.5, 1.9],
  ];
  for (const [cx, cy, r, ph] of curls) {
    g.push(`<polyline points="${P(spiral(cx, cy, r, 1.6, ph))}" fill="none" stroke="${hairDark}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`);
    g.push(`<polyline points="${P(spiral(cx + 0.9, cy - 0.9, r * 0.8, 1.2, ph + 0.5, 26))}" fill="none" stroke="${hairLight}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  // пряди, выбивающиеся на лоб и за ухо
  g.push(`<path d="M 60 50 C 56 48, 54 52, 56 56 M 96 100 C 92 104, 90 108, 92 112" fill="none" stroke="${hairDark}" stroke-width="1.6" stroke-linecap="round"/>`);

  // ---- наушники: дуга с объёмом (две линии) поверх волос, чашка на ухе с бликом
  g.push(`<path d="M 91 66 C 108 46, 104 24, 84 20 C 74 18, 64 22, 58 30" fill="none" stroke="${DUST}" stroke-width="3.6" stroke-linecap="round"/>`);
  g.push(`<path d="M 91 66 C 108 46, 104 24, 84 20 C 74 18, 64 22, 58 30" fill="none" stroke="${RESIN}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`);
  g.push(`<ellipse cx="90" cy="77" rx="8.5" ry="10" fill="${RESIN}" stroke="${DUST}" stroke-width="2.6"/>`);
  g.push(`<ellipse cx="90" cy="77" rx="4.5" ry="5.6" fill="none" stroke="${DUST_DIM}" stroke-width="1"/>`);
  g.push(`<path d="M 85 71 C 86 69, 88 68, 90 68" fill="none" stroke="${DUST}" stroke-width="1.2" stroke-linecap="round"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">\n${g.join('\n')}\n</svg>`;
}

const variants = [
  ['art', 'Гравюра, с надписью по ободу', build({ withText: true })],
  ['art-plain', 'Гравюра, гурт без надписи', build({ withText: false })],
  ['art-mono', 'Гравюра, одна нить', build({ withText: false, mono: true })],
];
const cards = [];
for (const [key, title, s] of variants) {
  fs.writeFileSync(path.join(OUT, `mark-${key}.svg`), s);
  cards.push(`<figure><div class="big">${s}</div><div class="small">${s}</div><figcaption>${title}</figcaption></figure>`);
  console.log('вариант:', key);
}
const prev = fs.readFileSync(path.join(OUT, 'mark-head.svg'), 'utf8');
cards.unshift(`<figure><div class="big">${prev}</div><div class="small">${prev}</div><figcaption>A. Схема (для сравнения)</figcaption></figure>`);
fs.writeFileSync(path.join(OUT, 'compare-art.html'), `<!doctype html><meta charset="utf-8"><title>Знак: гравюра</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700&display=swap">
<style>body{margin:0;background:#96be96;font:16px 'Roboto Slab',Georgia,serif;padding:16px}
.row{display:flex;gap:20px}figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.big svg{width:300px;height:300px}.small svg{width:48px;height:48px}figcaption{font-size:15px}</style>
<div class="row">${cards.join('')}</div>`);
console.log('лист:', path.join(OUT, 'compare-art.html'));
