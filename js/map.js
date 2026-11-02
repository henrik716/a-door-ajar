'use strict';

/* ───────── Map ───────── */
const svg = d3.select('#map');
const gTerrain = svg.select('.terrain'), gRL = svg.select('.rlabels'), gE = svg.select('.edges'), gD = svg.select('.dedges'), gN = svg.select('.nodes');
let nodeSel = gN.selectAll('g.n'), edgeSel = gE.selectAll('line'), dedgeSel = gD.selectAll('line'), rlSel = gRL.selectAll('text');
let regionInfo = [];

const zoom = d3.zoom().scaleExtent([0.2, 4.5])
  // When the zoom level changes, new labels appear; sort them out in the same frame so they do not flash on top of each other.
  .on('zoom', ev => { S.t = ev.transform; svg.classed('placed', true); updateScreen(); if (setZoomClass()) { clearTimeout(declTimer); runDeclutter(); } })
  .on('end', () => declutter());
svg.call(zoom).on('dblclick.zoom', null);
svg.on('click', ev => { if (S.step != null) return; if (ev.target === svg.node() || ev.target.closest('.terrain')) clearSel(); });

// Labels that would overlap are hidden. The most important win: selection, neighbours, the core, questions, insights.
const LPRI = { question: 50, word: 45, insight: 40, finding: 30, position: 25, image: 20, thinker: 10 };
let declTimer = null;
function declutter() {
  clearTimeout(declTimer);
  declTimer = setTimeout(runDeclutter, 90);
}
function runDeclutter() {
  if (!nodeSel) return;
  const items = [];
  nodeSel.each(function (d) {
    const t = this.querySelector('.lbl'); if (!t) return;
    t.classList.remove('lbl-x');
    if (getComputedStyle(t).display === 'none') return;
    const r = t.getBoundingClientRect(); if (!r.width) return;
    const c = this.classList;
    const pri = (c.contains('sel') ? 200 : c.contains('k-core') ? 150 : c.contains('k-sub') ? 140 : c.contains('nb') ? 120 : 0) + (c.contains('frontier') ? 15 : 0) + (LPRI[d.type] || 0);
    items.push({ t, r, pri });
  });
  items.sort((a, b) => b.pri - a.pri);
  const kept = [];
  for (const it of items) {
    const r = it.r, pad = 2;
    const hit = kept.some(k => r.left < k.right + pad && r.right > k.left - pad && r.top < k.bottom + pad && r.bottom > k.top - pad);
    if (hit) it.t.classList.add('lbl-x'); else kept.push(r);
  }
}
// Returns true when the zoom level changed.
function setZoomClass() {
  const k = S.t.k;
  const z = k < .62 ? 'z0' : k < 1.05 ? 'z1' : k < 1.7 ? 'z2' : 'z3';
  const el = svg.node();
  if (el.classList.contains(z)) return false;
  for (const c of ['z0', 'z1', 'z2', 'z3']) el.classList.toggle(c, c === z);
  return true;
}

function renderGraph() {
  const nodes = [...S.nodes.values()];
  const byId = S.nodes;
  // terrain
  regionInfo = REGION_ORDER.map(r => {
    const ns = nodes.filter(n => n.region === r);
    if (!ns.length) return null;
    const pts = [];
    for (const n of ns) for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; const rr = radOf(n) + 22; pts.push([n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr]); }
    const hull = d3.polygonHull(pts);
    const cx = d3.mean(ns, n => n.x), cy = d3.mean(ns, n => n.y);
    return { r, hull, cx, cy, lx: cx, ly: cy, label: REGION[r].label };
  }).filter(Boolean);
  const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(.5));
  gTerrain.selectAll('path').data(regionInfo.filter(d => d.r !== 'core'), d => d.r).join('path').attr('class', d => 'rg-' + d.r).attr('d', d => line(d.hull));
  rlSel = gRL.selectAll('text').data(regionInfo.filter(d => d.r !== 'core'), d => d.r).join('text').attr('class', d => 'rlabel rl-' + d.r).text(d => d.label);
  placeRegionLabels(nodes);
  // the trail home: from Alfred's world in to the middle
  const hd = regionInfo.find(d => d.r === 'dog');
  svg.select('.trail').selectAll('path').data(hd ? [hd] : []).join('path').attr('d', d => {
    const dx = -d.cx, dy = -d.cy, len = Math.hypot(dx, dy) || 1;
    const k = .22 * len, mx = d.cx + dx / 2, my = d.cy + dy / 2;
    return `M${d.cx},${d.cy} Q${mx - dy / len * k},${my + dx / len * k} 0,0`;
  });
  // contour lines rising towards the middle
  const rings = [.16, .3, .45, .61, .78, .96];
  svg.select('.topo').selectAll('path').data(rings).join('path').attr('class', (f, i) => i < 2 ? 'inner' : null).attr('d', f => {
    const pts = [];
    for (let i = 0; i < 90; i++) {
      const a = i / 90 * Math.PI * 2;
      const w = 1 + .05 * Math.sin(3 * a + 1.3 + f * 4) + .035 * Math.sin(5 * a + f * 9);
      pts.push([Math.cos(a) * RX * f * w, Math.sin(a) * RY * f * w]);
    }
    return line(pts);
  });

  // edges
  const E = S.edges.map(e => ({ ...e, source: byId.get(e.s), target: byId.get(e.o) }));
  edgeSel = gE.selectAll('line').data(E, d => d.s + '|' + d.p + '|' + d.o).join('line')
    .attr('class', d => `e p-${d.p}${d.source.type === 'thinker' || d.target.type === 'thinker' ? ' et' : ''}${Math.hypot(d.source.x - d.target.x, d.source.y - d.target.y) > 480 ? ' long' : ''}`);

  // nodes
  nodeSel = gN.selectAll('g.n').data(nodes, d => d.id).join(enter => {
    const g = enter.append('g').attr('tabindex', 0).attr('role', 'button');
    const sg = g.append('g').attr('class', 'sg');
    sg.append('path').attr('class', 'halo');
    sg.append('path').attr('class', 'core2');
    sg.append('path').attr('class', 'sym');
    sg.append('circle').attr('class', 'ring');
    sg.append('circle').attr('class', 'own-mark');
    g.append('text').attr('class', 'lbl');
    g.append('circle').attr('class', 'hit');
    return g;
  });
  nodeSel
    .attr('class', d => [
      'n', `t-${d.type}`, d.strength ? `s-${d.strength}` : '', d.status || '',
      d.id === 'alfred-now' ? 'k-core' : '', CORE_POS[d.id] ? 'k-sub' : '',
      CORE_POS[d.id] && d.x < -1 ? 'left' : '',
    ].filter(Boolean).join(' '))
    .attr('aria-label', d => `${TYPE[d.type]}: ${d.label}`);
  nodeSel.select('.sym').attr('d', d => symPath(d.type, sizeOf(d)));
  nodeSel.select('.core2').attr('d', d => d.id === 'alfred-now' ? d3.symbol().size(1720)() : null);
  nodeSel.select('.halo').attr('d', d => d.status ? d3.symbol().size(Math.pow(radOf(d) + 6, 2) * Math.PI)() : null);
  nodeSel.select('.ring').attr('r', d => radOf(d) + 4).attr('display', d => d.id === S.sel ? null : 'none');
  nodeSel.select('.hit').attr('r', d => Math.max(14, radOf(d) + 6));
  nodeSel.select('.own-mark').attr('r', 3).attr('cx', d => radOf(d) * .78).attr('cy', d => -radOf(d) * .78).attr('display', d => d.own ? null : 'none');
  nodeSel.select('.lbl').text(d => d.short || d.label);
  S.sf = null;
  nodeSel.on('click', (ev, d) => {
    ev.stopPropagation();
    const covered = !isDesk() && S.t.applyY(d.y) > stageSize().h * 0.36;
    select(d.id, { pan: covered, minK: 0.9 });
  })
    .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(d.id, { pan: true }); } });

  renderDerivedEdges();
  applyLens();
  applyFocus();
  updateScreen();
  setZoomClass();
  if (!S.firstFit && S.view === 'map') firstFit();
}

// Region names go where the region has the most room, as seen in the overview.
// The name is measured on screen and converted to map units at the overview zoom.
function placeRegionLabels(nodes) {
  const { w, h } = stageSize();
  const x0 = d3.min(nodes, n => n.x) - 40, x1 = d3.max(nodes, n => n.x) + 70, y0 = d3.min(nodes, n => n.y) - 40, y1 = d3.max(nodes, n => n.y) + 40;
  const k = Math.max(.15, Math.min((w - 56) / (x1 - x0), (h - 124) / (y1 - y0)));
  // what is visible in the overview, so names do not end up outside the edge
  const mx = (x0 + x1) / 2, vw = (w / 2 - 12) / k;
  const vis = nodes.filter(n => n.type !== 'thinker');
  const placed = [];
  rlSel.each(function (d) {
    let tw = 200; try { tw = this.getComputedTextLength() || tw; } catch (e) {}
    const hw = (tw / 2 + 8) / k, hh = 15 / k;
    const xs = d3.extent(d.hull, p => p[0]), ys = d3.extent(d.hull, p => p[1]);
    const step = Math.max(6, (ys[1] - ys[0]) / 24);
    const samp = [];
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) samp.push([-hw + i * hw / 3, -hh + j * hh]);
    let best = Infinity, bx = d.cx, by = d.cy;
    for (let x = xs[0]; x <= xs[1]; x += step) for (let y = ys[0]; y <= ys[1]; y += step) {
      if (!d3.polygonContains(d.hull, [x, y])) continue;
      let out = 0; for (const [sx, sy] of samp) if (!d3.polygonContains(d.hull, [x + sx, y + sy])) out++;
      let hit = 0;
      for (const n of vis) {
        const r = radOf(n) + 3 / k;
        if (Math.abs(n.x - x) < hw + r && Math.abs(n.y - y) < hh + r) hit += n.region === 'core' ? 3 : 1;
        // labels always shown in the overview (wrong words and the core questions) must not be covered either
        const lw = n.type === 'word' ? 70 / k : (n.region === 'core' && n.type === 'question') ? 140 / k : 0;
        if (lw) {
          const a = n.x < -1 && n.region === 'core' ? n.x - lw : n.x, b = a + lw;
          if (Math.min(b, x + hw) > Math.max(a, x - hw) && Math.abs(n.y - y) < hh + 12 / k) hit += 4;
        }
      }
      let lap = 0;
      for (const q of placed) lap += Math.max(0, Math.min(x + hw, q.x + q.hw) - Math.max(x - hw, q.x - q.hw)) * Math.max(0, Math.min(y + hh, q.y + q.hh) - Math.max(y - hh, q.y - q.hh)) / (hw * hh);
      const edge = Math.max(0, Math.abs(x - mx) + hw - vw) * k;
      const sc = edge * 2 + out / samp.length * 7 + hit * .55 + lap * 30 + .003 * Math.hypot(x - d.cx, y - d.cy);
      if (sc < best) { best = sc; bx = x; by = y; }
    }
    d.lx = bx; d.ly = by; placed.push({ x: bx, y: by, hw: hw + 34 / k, hh: hh + 6 / k });
  });
}

function renderDerivedEdges() {
  const byId = S.nodes;
  let D = [];
  if (S.showDerived) D = S.derived.filter(d => d.p !== 'qualifiesDerived' && (d.p !== 'mayDissolveDerived' || S.lens === 'words'));
  if (S.sel) D = D.concat(S.derived.filter(d => (d.s === S.sel || d.o === S.sel) && !D.includes(d)));
  D = D.map(d => ({ ...d, source: byId.get(d.s), target: byId.get(d.o) })).filter(d => d.source && d.target);
  dedgeSel = gD.selectAll('line').data(D, d => d.s + '|' + d.p + '|' + d.o).join('line').attr('class', d => `d dp-${d.p}`);
  dedgeSel.attr('display', d => (!S.showThinkers && (d.source.type === 'thinker' || d.target.type === 'thinker')) ? 'none' : null);
  updateEdgePositions(dedgeSel);
}

function updateEdgePositions(sel) {
  const t = S.t;
  sel.attr('x1', d => t.applyX(d.source.x)).attr('y1', d => t.applyY(d.source.y))
    .attr('x2', d => t.applyX(d.target.x)).attr('y2', d => t.applyY(d.target.y));
}
function updateScreen() {
  const t = S.t;
  const sf = Math.round(Math.max(.3, Math.min(1, .18 + .82 * t.k)) * 50) / 50; // smaller symbols in the overview, so they do not clump
  if (sf !== S.sf) {
    S.sf = sf;
    nodeSel.select('.sg').attr('transform', sf === 1 ? null : `scale(${sf})`);
    nodeSel.select('.lbl')
      .attr('x', d => d.id === 'alfred-now' ? 0 : (d.region === 'core' && d.type === 'question' && d.x < -1 ? -1 : 1) * ((radOf(d) + 5) * sf))
      .attr('y', d => d.id === 'alfred-now' ? radOf(d) * sf + 16 : 0);
  }
  nodeSel.attr('transform', d => `translate(${t.applyX(d.x).toFixed(1)},${t.applyY(d.y).toFixed(1)})`);
  updateEdgePositions(edgeSel);
  updateEdgePositions(dedgeSel);
  gTerrain.attr('transform', t.toString());
  svg.select('.topo').attr('transform', t.toString());
  placeGlow(t);
  svg.select('.trail').attr('transform', t.toString());
  rlSel.attr('x', d => t.applyX(d.lx)).attr('y', d => t.applyY(d.ly));
  const eo = (.3 + .42 * (1 - Math.exp(-.9 * t.k))) * (innerWidth < 640 ? .88 : 1);
  svg.node().style.setProperty('--eo', eo.toFixed(3));
}

// The door ajar. Until the map is placed, the glow stands alone in the middle of the stage.
// When the map arrives it glides the short way to Alfred, and the map opens round it.
function placeGlow(t) {
  const glow = svg.select('.glow');
  if (!svg.classed('placed')) { const { w, h } = stageSize(); glow.attr('transform', `translate(${w / 2},${h / 2})`); svg.classed('lit', true); return; }
  if (glow.classed('settled')) { glow.interrupt().attr('transform', t.toString()); return; }
  glow.classed('settled', true);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  glow.transition().duration(still ? 0 : 1100).ease(d3.easeCubicInOut).attr('transform', t.toString());
}
placeGlow(S.t);

// Let the door stand alone for a moment, also when the map loads fast.
const DOOR_MS = 1000;
function firstFit() {
  S.firstFit = true;
  const wait = DOOR_MS - performance.now();
  if (wait <= 0) return fit(false);
  setTimeout(() => {
    if (svg.classed('placed')) return;
    if (S.view === 'map') fit(false); else S.firstFit = false;
  }, wait);
}

function stageSize() { const r = svg.node().getBoundingClientRect(); return { w: r.width || 800, h: r.height || 600 }; }
function fit(anim = true) {
  const ns = [...S.nodes.values()]; if (!ns.length) return;
  const { w, h } = stageSize();
  const top = 64, pad = 28, bottom = 60;
  const x0 = d3.min(ns, n => n.x) - 40, x1 = d3.max(ns, n => n.x) + 70, y0 = d3.min(ns, n => n.y) - 40, y1 = d3.max(ns, n => n.y) + 40;
  const k = Math.min((w - pad * 2) / (x1 - x0), (h - top - bottom) / (y1 - y0));
  const tx = w / 2 - k * (x0 + x1) / 2, ty = top + (h - top - bottom) / 2 - k * (y0 + y1) / 2;
  const T = d3.zoomIdentity.translate(tx, ty).scale(k);
  (anim ? svg.transition().duration(600) : svg).call(zoom.transform, T);
}
$('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.45);
$('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.45);
$('#zfit').onclick = () => fit(true);
