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
  if (isDesk() && $('.app').classList.contains('dock-off')) { setDock(true, false); S.autoDock = true; }
  renderDerivedEdges();
  applyFocus();
  renderPanel();
  if (!fromHash && decodeURIComponent(location.hash.slice(1)) !== id) location.hash = id;
  if (pan && S.view === 'map') panTo(id, minK);
  if (!isDesk()) $('#panel').scrollTop = 0;
}
function panTo(id, minK = 1.25) {
  const n = S.nodes.get(id); if (!n) return;
  const { w, h } = stageSize();
  const k = Math.max(S.t.k, minK);
  // on mobile the panel covers the lower part of the map: centre in what is left above it, below the lenses
  let py = h / 2;
  if (!isDesk()) {
    const P = $('#panel'), sr = svg.node().getBoundingClientRect(), lens = $('.lensbar').getBoundingClientRect();
    const top = Math.max(0, lens.bottom - sr.top), bottom = P.hidden ? h : Math.min(h, P.getBoundingClientRect().top - sr.top);
    py = bottom - top > 60 ? (top + bottom) / 2 : h * 0.24;
  }
  const px = w / 2;
  const T = d3.zoomIdentity.translate(px - n.x * k, py - n.y * k).scale(k);
  svg.transition().duration(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650).call(zoom.transform, T);
}
function clearSel() {
  if (!S.sel) return;
  S.sel = null;
  S.step = null;
  if (S.autoDock) { S.autoDock = false; setDock(false); }
  renderDerivedEdges(); applyFocus(); renderPanel();
  location.hash = S.view;
}
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.sel && !ev.target.closest('input, textarea, select')) clearSel(); });
