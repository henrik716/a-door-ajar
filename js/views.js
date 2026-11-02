'use strict';

/* ───────── Views and addresses ───────── */
const VIEWS = ['map', 'register', 'patterns', 'export'];
function setView(v, { fromHash = false } = {}) {
  if (!VIEWS.includes(v)) v = 'map';
  S.view = v;
  for (const x of VIEWS) $('#v-' + x).hidden = x !== v;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  if (v === 'register') renderRegister();
  if (v === 'patterns') renderPatterns();
  if (v === 'export') renderExport();
  if (v === 'map') setTimeout(() => { if (!S.firstFit && loaded()) firstFit(); else updateScreen(); }, 0);
  renderPanel();
  if (!fromHash && decodeURIComponent(location.hash.slice(1)) !== v) location.hash = v;
}
document.querySelector('.tabs').addEventListener('click', ev => { const b = ev.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
function routeHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return;
  if (routeTour(h)) return;
  if (VIEWS.includes(h)) {
    if (h !== S.view) setView(h, { fromHash: true });
    S.step = null;
    if (S.sel) { S.sel = null; renderDerivedEdges(); applyFocus(); renderPanel(); }
    return;
  }
  if (S.retired.has(h)) { const to = replacement(h); if (to) location.replace('#' + encodeURIComponent(to)); return; }
  if (S.nodes.has(h) && h !== S.sel) select(h, { pan: true, fromHash: true });
}
window.addEventListener('hashchange', routeHash);
mq.addEventListener ? mq.addEventListener('change', () => { renderPanel(); }) : mq.addListener(() => renderPanel());
window.addEventListener('resize', () => { if (S.view === 'map') { updateScreen(); declutter(); } });

/* ───────── Meta and status line ───────── */
function renderMeta() {
  const tc = S.derived.length;
  $('#meta').textContent = loaded() ? `${S.nodes.size} steder · ${S.edges.length} koblinger · ${tc} utledet` : (S.loaded ? 'Kartet er tomt ennå' : 'Henter kartet …');
}
function setStatus(title, body) {
  const st = $('#status');
  if (!title) { st.hidden = true; return; }
  st.hidden = false; st.innerHTML = `<div><strong>${esc(title)}</strong>${esc(body)}</div>`;
}
function renderAll() {
  renderMeta();
  if (loaded()) { setStatus(null); renderGraph(); } else setStatus('Kartet er tomt ennå', 'Når stedene fra samtalene er lagt inn, tegnes kartet her.');
  if (S.view === 'register') renderRegister();
  if (S.view === 'patterns') renderPatterns();
  if (S.view === 'export') renderExport();
  renderPanel();
  const h = decodeURIComponent(location.hash.slice(1));
  if (h && S.retired.has(h)) { const to = replacement(h); if (to) location.replace('#' + encodeURIComponent(to)); }
  else if (h && S.nodes.has(h) && h !== S.sel) select(h, { pan: true, fromHash: true });
  else routeTour(h);
  $('#tourbtn').hidden = !tourSteps().length;
}
