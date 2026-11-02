'use strict';

/* ───────── Tour ─────────
 * A guided walk through the map, from data/tours.json: stages of steps, each step a
 * place, a short text and optionally a few places to look at alongside it ("also").
 * The map is not finished, so a tour is a snapshot and shows the date it was last
 * gone over. The address of a step is #tour/<n>, counted from 1. A tour may have an
 * introduction (#tour/0, kept as step -1) that shows the whole map and tells why it exists.
 */
const hasIntro = () => !!(S.tour && Array.isArray(S.tour.intro) && S.tour.intro.length);
const firstStep = () => (hasIntro() ? -1 : 0);
function tourSteps() {
  const t = S.tour, out = [];
  if (!t || !Array.isArray(t.stages)) return out;
  t.stages.forEach((st, si) => (st.steps || []).forEach(x => {
    if (S.nodes.has(x.node)) out.push({ ...x, stage: st.title, stageNo: si + 1 });
  }));
  return out;
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function goStep(i, { fromHash = false } = {}) {
  const steps = tourSteps(); if (!steps.length) return;
  i = Math.max(firstStep(), Math.min(steps.length - 1, i));
  S.step = i;
  if (S.view !== 'map') setView('map', { fromHash: true });
  if (i === -1) { // the introduction: no place selected, the whole map in view
    S.sel = null; S.intro = false;
    showPanel();
    renderDerivedEdges(); applyFocus(); renderPanel();
    requestAnimationFrame(() => fit(true)); // after the panel has taken its width
  } else select(steps[i].node, { pan: true, fromHash: true });
  const h = 'tour/' + (i + 1);
  if (!fromHash && decodeURIComponent(location.hash.slice(1)) !== h) location.hash = h;
  $('#panel').scrollTop = 0;
}
function endTour() { S.step = null; }

// Called from routeHash and after loading. Returns true when the address is a tour step.
function routeTour(h) {
  const m = /^tour\/(\d+)$/.exec(h || '');
  if (!m) return false;
  if (loaded() && S.tour) {
    const i = +m[1] - 1, steps = tourSteps();
    if (i === -1 ? (S.step !== -1 || S.sel) : (i !== S.step || !steps[i] || S.sel !== steps[i].node)) goStep(i, { fromHash: true });
  }
  return true;
}
function tourReady() {
  $('#tourbtn').hidden = !tourSteps().length;
  if (routeTour(decodeURIComponent(location.hash.slice(1)))) return;
  if (!S.sel) renderPanel();
}

function tourDate() {
  const d = S.tour && S.tour.updated ? new Date(S.tour.updated) : null;
  return d && !isNaN(d) ? d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}
function tourStartHTML() {
  if (!tourSteps().length) return '';
  return `<div class="tour-start"><button type="button" class="btn" data-tour="start">Gå gjennom kartet</button>
    <span class="formmsg">${tourSteps().length} stopp, fra det som står fast til det som er åpent</span></div>`;
}
// The introduction, shown in the panel instead of a place.
function tourIntroHTML() {
  const n = tourSteps().length, date = tourDate();
  const ps = S.tour.intro.map(p => `<p class="tour-text">${esc(tx(p))}</p>`).join('');
  return `<section class="tour t-intro" aria-label="Vandringen">
    <div class="tour-head"><span class="eyebrow">${esc(tx(S.tour.title) || 'Vandringen')}</span><span class="tour-n">${n} stopp</span></div>
    ${ps}
    ${date ? `<p class="tour-snap">Ruta slik den sto ${esc(date)}.</p>` : ''}
    <div class="tour-nav"><button type="button" class="btn" data-tour="next">Begynn</button>
    <button type="button" class="lnkbtn" data-tour="end">Avslutt</button></div></section>`;
}
// The box at the top of the panel while a tour is going on.
function tourBoxHTML() {
  const steps = tourSteps();
  if (S.step == null || (S.step !== -1 && !steps[S.step])) return '';
  const i = S.step, x = steps[i], n = steps.length;
  const count = `<span class="tour-n">${i === -1 ? 'Innledning' : `${i + 1} av ${n}`}</span>`;
  if (!x || S.sel !== x.node) {
    return `<section class="tour off" aria-label="Vandringen">
      <div class="tour-head"><span class="eyebrow">Vandringen</span>${count}</div>
      <div class="tour-nav"><button type="button" class="btn ghost" data-tour="back">Tilbake til ruta</button>
      <button type="button" class="lnkbtn" data-tour="end">Avslutt</button></div></section>`;
  }
  const also = (x.also || []).filter(id => S.nodes.has(id)).map(id => lnk(id)).join('');
  const date = tourDate();
  const snap = ((i === 0 && !hasIntro()) || i === n - 1) && date
    ? `<p class="tour-snap">Ruta slik den sto ${esc(date)}.</p>` : '';
  const last = i === n - 1;
  return `<section class="tour" aria-label="Vandringen">
    <div class="tour-head"><span class="eyebrow">${ROMAN[x.stageNo - 1] || x.stageNo} · ${esc(tx(x.stage))}</span>${count}</div>
    <p class="tour-text">${esc(tx(x.text))}</p>
    ${also ? `<div class="tour-also"><span>Se også</span>${also}</div>` : ''}
    ${snap}
    <div class="tour-nav">
      ${i > firstStep() ? `<button type="button" class="btn ghost" data-tour="prev" aria-label="Forrige stopp">←</button>` : ''}
      ${last ? `<button type="button" class="btn" data-tour="explore">Utforsk selv</button><button type="button" class="btn ghost" data-tour="start">Begynn på nytt</button>`
        : `<button type="button" class="btn" data-tour="next">Neste</button>`}
      ${last ? '' : `<button type="button" class="lnkbtn" data-tour="end">Avslutt</button>`}
    </div></section>`;
}

$('#panel').addEventListener('click', ev => {
  const b = ev.target.closest('[data-tour]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.tour;
  if (a === 'start') goStep(firstStep());
  else if (a === 'next') goStep(S.step + 1);
  else if (a === 'prev') goStep(S.step - 1);
  else if (a === 'back') goStep(S.step);
  else if (a === 'end' || a === 'explore') { endTour(); if (S.sel) clearSel(); else { hideAutoPanel(); renderPanel(); } }
}, true);
$('#tourbtn').onclick = () => goStep(S.step == null ? firstStep() : S.step);
document.addEventListener('keydown', ev => {
  if (S.step == null || ev.target.closest('input, textarea, select') || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const steps = tourSteps();
  if (S.step === -1) { if (ev.key === 'ArrowRight' && !S.sel) { ev.preventDefault(); goStep(0); } return; }
  if (!steps[S.step] || S.sel !== steps[S.step].node) return;
  if (ev.key === 'ArrowRight' && S.step < steps.length - 1) { ev.preventDefault(); goStep(S.step + 1); }
  if (ev.key === 'ArrowLeft' && S.step > firstStep()) { ev.preventDefault(); goStep(S.step - 1); }
});
