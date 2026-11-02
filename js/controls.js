'use strict';

/* ───────── Legend ───────── */
function lgSym(type, sty, color) {
  return miniSym({ type, strength: sty }, color).replace('class="mini"', 'viewBox="-11 -8 22 16"');
}
function lgLine(cls) {
  return `<svg viewBox="0 0 22 16" aria-hidden="true"><line x1="1" y1="8" x2="21" y2="8" class="${cls}" style="stroke-opacity:1"/></svg>`;
}
function renderLegend() {
  const L = $('#legend');
  let lens = '';
  if (S.lens === 'hope') lens = `<h3>Håpsnivå</h3><div class="lg">${[1, 2].map(h => `${lgSym('position', 'solid', `var(--h${h})`)}<span>${h} · ${HOPE[h].l}</span>`).join('')}</div>
    <p class="lgnote">Hvis noe av ham fortsetter, er det to spørsmål: om perspektivet er hans, og om innholdet blir med.</p>${hopeGridHTML(S.hope)}${hopeExplainHTML(S.hope, HF_OPEN)}
    ${S.hope ? `<div class="lg">${lgSym('position', 'solid', 'var(--ctr)')}<span>Står imot dette nivået</span></div>` : ''}`;
  if (S.lens === 'evidence') lens = `<h3>Evidens</h3><div class="lg">${Object.keys(STRENGTH).map(s => `${lgSym('position', 'solid', `var(--e-${s})`)}<span>${STRENGTH[s]}</span>`).join('')}${lgSym('position', 'solid', 'var(--e-own)')}<span>Egen slutning eller eget forsøk</span></div>`;
  if (S.lens === 'words') lens = `<h3>Feil ord</h3><div class="lg">${lgSym('word', null, 'var(--t-word)')}<span>Ordet</span>${lgSym('position', 'solid', 'var(--violet)')}<span>Spørsmål som bruker ordet</span>${lgSym('position', 'solid', 'var(--ink)')}<span>Det som utfordrer ordet</span></div>`;
  L.innerHTML = `${lens}
    <h3>Hva et punkt er</h3><div class="lg">${TYPE_ORDER.map(t => `${lgSym(t, t === 'question' ? null : 'solid')}<span>${TYPE[t]}</span>`).join('')}</div>
    <h3>Hvor godt det står</h3><div class="lg">${Object.keys(STRENGTH).map(s => `${lgSym('position', s, 'var(--ink-2)')}<span>${STRENGTH[s]}</span>`).join('')}
      <svg viewBox="-11 -8 22 16" aria-hidden="true"><circle r="6.5" fill="none" stroke="var(--ctr)" stroke-dasharray="2 2"/></svg><span>Fronten: gravd i, fortsatt åpent</span>
      <svg viewBox="-11 -8 22 16" aria-hidden="true"><circle r="6.5" fill="none" stroke="var(--ink-3)" stroke-dasharray="1 2"/></svg><span>Ikke gravd ennå</span>
      <svg viewBox="-11 -8 22 16" aria-hidden="true"><circle r="4" fill="var(--e-own)" stroke="var(--paper)" stroke-width="1.2"/></svg><span>Egen slutning eller eget forsøk</span></div>
    <h3>Koblinger</h3><div class="lg">
      ${lgLine('e p-supports')}<span>Støtter, henger sammen</span>
      ${lgLine('e p-contradicts')}<span>Motsier</span>
      ${lgLine('e p-presupposes')}<span>Forutsetter</span>
      ${lgLine('e p-dissolves')}<span>Oppløser eller gjør godt stilt</span>
      ${lgLine('e p-leadsTo')}<span>Leder til en innsikt</span>
      ${lgLine('e p-challengesWord')}<span>Bruker eller utfordrer et ord</span>
      ${lgLine('e p-influenced')}<span>Påvirket, i idéhistorien</span>
      ${lgLine('d')}<span>Utledet av reglene</span></div>`;
}
$('#legendbtn').onclick = () => {
  const L = $('#legend'); L.hidden = !L.hidden;
  // the map buttons may wrap to two rows on narrow screens: open the legend above them
  const st = $('#v-map').getBoundingClientRect(), b = $('.mapbtns').getBoundingClientRect();
  L.style.bottom = (st.bottom - b.top + 8) + 'px';
  $('#legendbtn').setAttribute('aria-expanded', String(!L.hidden));
};
/* ───────── Light and dark mode ───────── */
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
const effTheme = () => document.documentElement.dataset.theme || (darkMq.matches ? 'dark' : 'light');
function paintThemeBtn() {
  const dark = effTheme() === 'dark', b = $('#themebtn');
  b.innerHTML = dark ? SUN : MOON;
  b.setAttribute('aria-label', dark ? 'Bytt til lys modus' : 'Bytt til mørk modus');
  b.title = dark ? 'Lys modus' : 'Mørk modus';
}
// on desktop the side panel can be docked away, giving the map, register and patterns the full width
const DOCK_ON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/><path d="M18 10l-1.5 2 1.5 2"/></svg>';
const DOCK_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/><path d="M17 10l1.5 2-1.5 2"/></svg>';
function setDock(on, remember = true) {
  if (remember) S.autoDock = false;
  $('.app').classList.toggle('dock-off', !on);
  const b = $('#dockbtn'); b.innerHTML = on ? DOCK_ON : DOCK_OFF;
  const l = on ? 'Skjul sidepanelet' : 'Vis sidepanelet'; b.setAttribute('aria-label', l); b.title = l;
  if (remember) try { localStorage.setItem('dpg-dock', on ? '1' : '0'); } catch (e) {}
  if (S.view === 'map') requestAnimationFrame(() => { updateScreen(); declutter(); });
}
$('#dockbtn').onclick = () => setDock($('.app').classList.contains('dock-off'));
(() => { let on = true; try { on = localStorage.getItem('dpg-dock') !== '0'; } catch (e) {} setDock(on); })();
$('#themebtn').onclick = () => {
  const next = effTheme() === 'dark' ? 'light' : 'dark';
  window.__theme = next;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('dpg-theme', next); } catch (e) {}
  paintThemeBtn();
};
if (darkMq.addEventListener) darkMq.addEventListener('change', paintThemeBtn);
paintThemeBtn();
$('#panel').addEventListener('toggle', ev => { const c = ev.target.classList; if (!c) return; if (c.contains('gloss')) S.glossOpen = ev.target.open; else if (c.contains('about')) S.aboutOpen = ev.target.open; }, true);
$('#statusbtn').onclick =() => { S.intro = true; if (S.sel) { S.sel = null; renderDerivedEdges(); applyFocus(); } renderPanel(); $('#panel').scrollTop = 0; };

/* ───────── Lens controls ───────── */
$('#lensrow').addEventListener('click', ev => {
  const b = ev.target.closest('[data-lens]');
  if (b) {
    S.lens = b.dataset.lens;
    document.querySelectorAll('[data-lens]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#hoperow').hidden = S.lens !== 'hope';
    renderDerivedEdges(); applyLens();
    return;
  }
  if (ev.target.closest('#tog-derived')) {
    S.showDerived = !S.showDerived; $('#tog-derived').setAttribute('aria-pressed', String(S.showDerived)); renderDerivedEdges(); applyFocus();
  }
  if (ev.target.closest('#tog-thinkers')) {
    S.showThinkers = !S.showThinkers; $('#tog-thinkers').setAttribute('aria-pressed', String(S.showThinkers)); renderDerivedEdges(); applyLens();
  }
});
function setHope(h) {
  S.hope = S.hope === h && h !== 0 ? 0 : h;
  document.querySelectorAll('#hoperow [data-hope]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.hope === S.hope)));
  applyLens();
}
$('#hoperow').addEventListener('click', ev => { const b = ev.target.closest('[data-hope]'); if (b) setHope(+b.dataset.hope); });
// the cells in the legend can be selected too
$('#legend').addEventListener('click', ev => { const b = ev.target.closest('[data-hope]'); if (b) setHope(+b.dataset.hope); });
$('#legend').addEventListener('toggle', ev => { if (ev.target.classList && ev.target.classList.contains('hope-explain')) HF_OPEN = ev.target.open; }, true);
