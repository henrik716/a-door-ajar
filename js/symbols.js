'use strict';

/* ───────── Symbols ───────── */
const SYMT = { question: d3.symbolCircle, position: d3.symbolCircle, thinker: d3.symbolSquare, finding: d3.symbolTriangle, word: d3.symbolDiamond, image: d3.symbolStar };
function hexPath(area) {
  const r = Math.sqrt(area / 2.598);
  let p = '';
  for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; p += (i ? 'L' : 'M') + (r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2); }
  return p + 'Z';
}
const symPath = (type, size) => type === 'insight' ? hexPath(size) : d3.symbol().type(SYMT[type] || d3.symbolCircle).size(size)();
const sizeOf = d => d.id === 'alfred-now' ? 1000 : (d.region === 'core' && d.type === 'question') ? 360 : SIZE[d.type] || 120;
const radOf = d => Math.sqrt(sizeOf(d) / Math.PI);
function miniSym(d, color) {
  const sz = d.type === 'thinker' ? 60 : 110;
  const c = color || `var(--t-${d.type})`;
  let fo = 1, dash = '';
  if (d.type === 'question') fo = 0;
  else if (d.strength === 'supported') fo = .68; else if (d.strength === 'position') fo = .34;
  else if (d.strength === 'contested') { fo = .1; dash = 'stroke-dasharray="2 1.5"'; }
  else if (d.strength === 'image') { fo = 0; dash = 'stroke-dasharray="1 1.5"'; }
  return `<svg class="mini" viewBox="-8 -8 16 16" aria-hidden="true"><path d="${symPath(d.type, sz)}" fill="${c}" fill-opacity="${fo}" stroke="${c}" stroke-width="${d.type === 'question' ? 2 : 1.3}" ${dash}/></svg>`;
}
