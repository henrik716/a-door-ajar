'use strict';

/* ───────── Selection ───────── */
function neighbors(id) {
  const s = new Set();
  for (const e of S.edges) { if (e.s === id) s.add(e.o); if (e.o === id) s.add(e.s); }
  for (const d of S.derived) { if (d.s === id) s.add(d.o); if (d.o === id) s.add(d.s); }
  return s;
}
function applyFocus() {
  const el = svg.node();
  el.classList.toggle('focus', !!S.sel);
  const nb = S.sel ? neighbors(S.sel) : new Set();
  nodeSel.classed('sel', d => d.id === S.sel).classed('nb', d => nb.has(d.id));
  nodeSel.select('.ring').attr('display', d => d.id === S.sel ? null : 'none');
  edgeSel.classed('on', d => !!S.sel && (d.s === S.sel || d.o === S.sel));
  declutter();
}
function select(id, { pan = false, fromHash = false, minK = 1.25 } = {}) {
  if (!S.nodes.has(id)) return;
  S.sel = id;
  S.intro = false;
  showPanel();
  renderDerivedEdges();
  applyFocus();
  renderPanel();
  if (!fromHash && decodeURIComponent(location.hash.slice(1)) !== id) location.hash = id;
  if (pan && S.view === 'map') panTo(id, minK);
  if (!isDesk()) $('#panel').scrollTop = 0;
}
// On desktop, open a docked-away panel for something that is shown in it, and close it again
// afterwards, unless the reader opened it themselves in the meantime.
function showPanel() {
  if (isDesk() && $('.app').classList.contains('dock-off')) { setDock(true, false); S.autoDock = true; }
}
function hideAutoPanel() {
  if (S.autoDock) { S.autoDock = false; setDock(false); }
}
function panTo(id, minK = 1.25) {
  const n = S.nodes.get(id); if (!n) return;
  const { w, h } = stageSize();
  const k = Math.max(S.t.k, minK);
  // on mobile the panel covers the lower part of the map: centre in what is left above it, below the lenses
  let py = h / 2;
  if (!isDesk()) { const { top, bottom } = visibleBand(); py = bottom - top > 60 ? (top + bottom) / 2 : h * 0.24; }
  const px = w / 2;
  const T = d3.zoomIdentity.translate(px - n.x * k, py - n.y * k).scale(k);
  svg.transition().duration(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650).call(zoom.transform, T);
}
// The part of the stage on mobile that is neither under the lenses nor under the sheet, in stage pixels.
// The sheet's height is taken from its state, not measured, since it may still be moving.
function visibleBand() {
  const { w, h } = stageSize();
  const P = $('#panel'), sr = svg.node().getBoundingClientRect(), lens = $('.lensbar').getBoundingClientRect();
  const top = Math.max(0, lens.bottom - sr.top);
  const sheetH = P.hidden ? 0 : Math.min(P.scrollHeight, S.sheet === 'low' && S.sel ? sheetLowPx() : innerHeight * .64);
  return { w, h, top, bottom: Math.min(h, innerHeight - sheetH - sr.top) };
}
// Zoom so that a place and all its neighbours fit in the visible part of the map, so the lines can be seen.
function frameNeighbourhood(id) {
  const n = S.nodes.get(id); if (!n || S.view !== 'map') return;
  const pts = [n, ...[...neighbors(id)].map(x => S.nodes.get(x)).filter(m => m && (S.showThinkers || m.type !== 'thinker'))];
  const { w, top, bottom } = visibleBand();
  // room for the labels, which run to the right of the symbols
  const padL = 24, padR = Math.min(140, w * .34), padY = 34;
  const bw = w - padL - padR, bh = bottom - top - padY * 2;
  if (bh < 60) { panTo(id, 0.9); return; }
  const x0 = d3.min(pts, p => p.x), x1 = d3.max(pts, p => p.x), y0 = d3.min(pts, p => p.y), y1 = d3.max(pts, p => p.y);
  // the neighbours are often spread over the whole map, so this may go as far out as the overview does
  const k = Math.max(.06, Math.min(1.6, bw / Math.max(x1 - x0, 1), bh / Math.max(y1 - y0, 1)));
  const T = d3.zoomIdentity.translate(padL + bw / 2 - k * (x0 + x1) / 2, (top + bottom) / 2 - k * (y0 + y1) / 2).scale(k);
  svg.transition().duration(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650).call(zoom.transform, T);
}
function clearSel() {
  if (!S.sel) return;
  S.sel = null;
  S.sheet = 'high';
  S.step = null;
  hideAutoPanel();
  renderDerivedEdges(); applyFocus(); renderPanel();
  location.hash = S.view;
}
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.sel && !ev.target.closest('input, textarea, select')) clearSel(); });
