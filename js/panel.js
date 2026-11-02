'use strict';

/* ───────── Panel ───────── */
function nref(id, extra = '') {
  const n = S.nodes.get(id); if (!n) return '';
  return `<button type="button" class="nref" data-go="${esc(id)}">${miniSym(n)}<span class="nm">${esc(n.label)}${extra ? `<small>${extra}</small>` : ''}</span></button>`;
}
function lnk(id, cls = '') {
  const n = S.nodes.get(id); if (!n) return '';
  return `<button type="button" class="lnk ${cls}" data-go="${esc(id)}">${esc(n.short || n.label)}</button>`;
}
function relationsHTML(id) {
  const groups = new Map();
  const push = (label, html, order) => { if (!groups.has(label)) groups.set(label, { order, items: [] }); groups.get(label).items.push(html); };
  for (const e of S.edges) {
    if (e.s === id) push(PRED[e.p][0], nref(e.o, esc(e.m)), PRED_ORDER.indexOf(e.p) * 2);
    if (e.o === id) push(PRED[e.p][1], nref(e.s, esc(e.m)), PRED_ORDER.indexOf(e.p) * 2 + 1);
  }
  let html = [...groups.entries()].sort((a, b) => a[1].order - b[1].order)
    .map(([l, g]) => `<div class="rel"><h4>${esc(l)}</h4><div class="rlist">${g.items.join('')}</div></div>`).join('');
  const dg = new Map();
  const dpush = (label, h) => { if (!dg.has(label)) dg.set(label, []); dg.get(label).push(h); };
  for (const d of S.derived) {
    const via = S.nodes.get(d.via);
    const viaTxt = via ? (d.p === 'mayDissolveDerived' ? `via ordet «${esc(via.label)}»` : `via «${esc(via.short || via.label)}»`) : '';
    if (d.s === id) dpush(DPRED[d.p][0], nref(d.o, viaTxt));
    else if (d.o === id) dpush(DPRED[d.p][1], nref(d.s, viaTxt));
  }
  if (dg.size) {
    html += `<div class="divider"></div><p class="formmsg" style="margin:0 0 10px">Utledede koblinger, funnet med reglene i Eksport. Ingen har tegnet dem for hånd.</p>`;
    html += [...dg.entries()].map(([l, items]) => `<div class="rel"><h4 class="dv">${esc(l)}</h4><div class="rlist">${items.join('')}</div></div>`).join('');
  }
  return html;
}
function tagsHTML(n) {
  const t = [];
  if (n.own) t.push(`<span class="tag own"><span class="dot"></span>${n.type === 'finding' ? 'Eget forsøk' : 'Egen slutning'}</span>`);
  if (n.strength) t.push(`<span class="tag" style="--sw: var(--e-${n.strength})"><span class="dot"></span>${n.own && n.type !== 'finding' ? BASIS[n.strength] : STRENGTH[n.strength]}</span>`);
  for (const h of n.hope) t.push(`<span class="tag" style="--sw: var(--h${h})"><span class="dot"></span>Håp ${h}: ${HOPE[h].k}</span>`);
  if (n.status === 'frontier') t.push(`<span class="tag frontier">Front, åpent å grave</span>`);
  if (n.status === 'planned') t.push(`<span class="tag plan">Neste gravested</span>`);
  if (n.conversation === 'alfred') t.push(`<span class="tag plan">Fra «Min kjære Alfred»</span>`);
  if (n.conversation === 'map') t.push(`<span class="tag plan">Lagt til i kartet</span>`);
  return t.length ? `<div class="tags">${t.join('')}</div>` : '';
}
function notesHTML(id) {
  const ns = S.notes.filter(x => x.node === id).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const fmt = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); };
  let h = '';
  if (ns.length) h += `<div class="notes">${ns.map(x => `<div class="note"><time>${esc(fmt(x.time))}</time>${esc(tx(x.text))}</div>`).join('')}</div>`;
  if (S.db && S.writer !== false) {
    h += `<form class="form" data-form="note">
      <label class="sect-h" for="note-text">${ns.length ? 'Nytt notat' : 'Notater'}</label>
      <textarea class="inp" id="note-text" name="text" placeholder="En tanke, et spørsmål, noe å grave videre i" required></textarea>
      <button class="btn" type="submit">Lagre notat</button><span class="formmsg" data-msg></span></form>`;
  } else if (!ns.length) return '';
  return h;
}
// The place's change log: what moved since it was added, oldest first.
const FIELD = { type: 'type', region: 'område', label: 'navn', short: 'kortnavn', strength: 'styrke', hope: 'håp', own: 'egen slutning',
  status: 'status', answer: 'svar', text: 'tekst', sources: 'kilder', links: 'koblinger' };
const fmtDay = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); };
// a short field's value as the map shows it
function fieldValue(k, v) {
  if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return 'ingen';
  if (k === 'strength') return (STRENGTH[v] || v).toLowerCase();
  if (k === 'type') return (TYPE[v] || v).toLowerCase();
  if (k === 'region') return REGION[v] ? REGION[v].label : v;
  if (k === 'status') return v === 'frontier' ? 'front' : v === 'planned' ? 'neste gravested' : v;
  if (k === 'own') return v ? 'egen slutning' : 'ikke egen';
  if (k === 'hope') return Array.isArray(v) ? v.join(', ') : String(v);
  return String(v);
}
function changesHTML(n) {
  if (!n.changes.length) return '';
  const items = n.changes.map(c => {
    const from = c.from && typeof c.from === 'object' ? c.from : {};
    const f = Array.isArray(c.fields) ? c.fields.map(k => (FIELD[k] || k) + (k in from ? ` (var ${fieldValue(k, from[k])})` : '')).join(', ') : '';
    const head = [fmtDay(c.date), f && !c.text ? 'Endret: ' + f : f].filter(Boolean).join(' · ');
    return `<div class="note change"><time>${esc(head)}</time>${c.text ? esc(tx(c.text)) : ''}</div>`;
  }).join('');
  return `<div class="divider"></div><h4 class="sect-h">Endringer</h4>
    <p class="formmsg" style="margin:0 0 6px">Lagt til ${esc(fmtDay(n.added))}. Det som har flyttet seg siden:</p>
    <div class="notes">${items}</div>`;
}
function addEdgeHTML(id) {
  if (!S.db || S.writer === false) return '';
  const opts = ADDABLE.map(p => `<option value="${p}">${esc(PRED[p][0])}</option>`).join('');
  return `<details><summary class="sect-h" style="cursor:pointer">Ny kobling herfra</summary>
    <form class="form" data-form="edge">
      <div class="row"><select class="inp" id="edge-rel" name="rel">${opts}</select>
      <input class="inp" id="edge-to" name="to" list="nodenames" placeholder="Til hvilket sted?" required></div>
      <input class="inp" id="edge-note" name="note" placeholder="Merknad (valgfritt)">
      <button class="btn" type="submit">Legg til kobling</button><span class="formmsg" data-msg></span>
    </form></details>`;
}
function aboutHTML() {
  return `<details class="about"${S.aboutOpen ? ' open' : ''}><summary>Om kartet</summary>
    <div class="about-body">
      <p>Alfred var en finsk lapphund. Jeg kjente ham i tretten av hans nesten fjorten år. Han døde hjemme 26. oktober 2026, etter en lang dag ute i sola, med oss rundt seg.</p>
      <p>Dagene etter satt jeg igjen med ett spørsmål: Hvor er Alfred nå? Dette kartet er et forsøk på å se ordentlig på det spørsmålet, med fysikk, filosofi, religion, hjerneforskning og sorg side om side.</p>
      <p>Navnet kommer fra ham. I tretten år gikk jeg ut døra uten at han visste hvor jeg ble av, men han visste at jeg fantes, og han ventet. Og han trengte aldri en åpen dør. En glipe var alltid nok.</p>
      <p>Ingen vet hva som er på den andre siden. Kartet gir ikke et svar. Det viser hva vi vet, hva vi ikke vet, og hvor døra står.</p>
    </div></details>`;
}
function statusHTML() {
  const st = S.status;
  if (!st || !Array.isArray(st.points) || !st.points.length) return '';
  const d = st.updated ? new Date(st.updated) : null;
  const date = d && !isNaN(d) ? d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const numbered = st.points.some(p => p && p.strength);
  const pts = st.points.filter(p => p && p.text).map((p, i) => {
    const meta = p.strength && STRENGTH[p.strength]
      ? `<span class="spt-meta"><i class="spt-dot" style="background:var(--e-${esc(p.strength)})"></i>${esc(STRENGTH[p.strength])}${p.own ? ' · egen slutning' : ''}</span>` : '';
    const inner = `${numbered ? `<span class="spt-n">${i + 1}</span>` : ''}<span class="spt-body"><span class="spt-t">${esc(tx(p.text))}</span>${meta}</span>`;
    return p.node && S.nodes.has(p.node)
      ? `<li><button type="button" class="status-pt${numbered ? ' num' : ''}" data-go="${esc(p.node)}">${inner}</button></li>`
      : `<li><span class="status-pt${numbered ? ' num' : ''}">${inner}</span></li>`;
  }).join('');
  const next = (Array.isArray(st.next) ? st.next : []).filter(id => S.nodes.has(id)).map(id => nref(id)).join('');
  const hist = S.statusHistory.slice().reverse().map(v => `<div class="note"><time>${esc(fmtDay(v.updated))} til ${esc(fmtDay(v.replaced))}</time>${esc(tx(v.why))}</div>`).join('');
  return `<section class="status" aria-label="Hvor vi står">
    <div class="eyebrow">${esc(tx(st.title) || 'Hvor vi står')}${date ? ' · ' + esc(date) : ''}</div>
    ${st.lead ? `<p class="status-lead">${esc(tx(st.lead))}</p>` : ''}
    <ul class="status-list">${pts}</ul>
    ${next ? `<div class="rel"><h4>Der vi graver videre</h4><div class="rlist">${next}</div></div>` : ''}
    ${hist ? `<details class="status-history"><summary class="sect-h" style="cursor:pointer">Tidligere versjoner (${S.statusHistory.length})</summary><div class="notes">${hist}</div></details>` : ''}
  </section><div class="divider"></div>`;
}
function renderPanel() {
  const P = $('#panel');
  if (!S.sel && S.step === -1 && hasIntro()) {
    P.hidden = false;
    P.innerHTML = `${isDesk() ? '' : '<div class="grab" aria-hidden="true"></div>'}${tourIntroHTML()}`;
    return;
  }
  if (!S.sel) {
    const show = isDesk() || S.intro;
    P.hidden = !show;
    if (!show) { P.innerHTML = ''; return; }
    const fronts = [...S.nodes.values()].filter(n => n.status === 'frontier');
    const plan = [...S.nodes.values()].filter(n => n.status === 'planned');
    P.innerHTML = `${isDesk() ? '' : '<div class="grab" aria-hidden="true"></div><div class="phead"><div class="eyebrow">Dør på gløtt</div><button type="button" class="xbtn" data-close aria-label="Lukk">✕</button></div>'}${aboutHTML()}${loaded() ? tourStartHTML() : ''}${statusHTML()}<div class="intro">
      <div class="eyebrow">Slik leser du kartet</div>
      <h2>Hvor er Alfred nå?</h2>
      <p>Spørsmålet står i midten, delt i de fire delene vi fant. Rundt dem ligger våre egne slutninger, og ytterst områdene vi har gravd i.</p>
      <p>Formen viser hva et punkt er, og fyllet viser hvor godt det står: helt fylt er solid, stiplet er omstridt, prikket er et bilde. En liten gul prikk ved et sted betyr at det er noe vi har kommet fram til selv, ikke noe fra faget. Navnene og linjene kommer fram etter hvert som du zoomer inn, slik som på et vanlig kart.</p>
      <p>Trykk på et punkt for å se hva det henger sammen med. Linsene øverst farger kartet etter håp, evidens eller feil ord. Håpet har to nivåer for det som er igjen i verden og i deg, og fire ruter for hva som eventuelt fortsetter: om perspektivet er hans, og om innholdet blir med. Utledede koblinger er sammenhenger reglene fant, ikke vi. Tenkerne er skjult til du slår dem på.</p>
      ${S.db && S.writer === true ? '<p>Kartet er levende. Nye steder kan legges inn fra begge samtalene, og du kan skrive notater selv.</p>' : ''}
    </div>
    ${loaded() ? `<div class="divider"></div><div class="rel"><h4>Fronten</h4><div class="rlist">${fronts.map(n => nref(n.id)).join('')}</div></div>
    <div class="rel"><h4>Neste gravesteder</h4><div class="rlist">${plan.map(n => nref(n.id)).join('')}</div></div>` : ''}`;
    return;
  }
  const n = S.nodes.get(S.sel);
  if (!n) { S.sel = null; renderPanel(); return; }
  P.hidden = false;
  const sources = n.sources.filter(x => x && x.title).map(x => `<li>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(tx(x.title))}</a>` : esc(tx(x.title))}</li>`).join('');
  P.innerHTML = `<div class="grab" aria-hidden="true"></div>${tourBoxHTML()}
    <div class="phead"><div class="eyebrow">${esc(TYPE[n.type])} · ${esc(REGION[n.region].label)}</div>
    <button type="button" class="xbtn" data-close aria-label="Lukk">✕</button></div>
    <h2>${miniSym(n).replace('class="mini"', 'class="mini sym-inline"')}${esc(n.label)}</h2>
    ${tagsHTML(n)}
    ${n.own ? `<p class="formmsg" style="margin:-4px 0 12px">${n.type === 'finding' ? 'Dette er et lite forsøk vi har gjort selv, ikke en publisert studie.' : 'Dette er noe vi har kommet fram til selv i samtalene, ikke noe fagfolk har vurdert.'}</p>` : ''}
    ${n.answer ? `<p class="answer"><b>Svar</b>${esc(n.answer)}</p>` : ''}
    ${n.text ? `<p class="ptext">${esc(n.text)}</p>` : ''}
    ${S.view !== 'map' ? `<p><button type="button" class="btn ghost" data-showmap>Vis i kartet</button></p>` : ''}
    ${relationsHTML(n.id)}
    ${sources ? `<div class="divider"></div><h4 class="sect-h">Kilder og lesestoff</h4><ul class="sources">${sources}</ul>` : ''}
    ${changesHTML(n)}
    <div class="divider"></div>
    ${notesHTML(n.id)}
    ${addEdgeHTML(n.id)}
    <datalist id="nodenames">${[...S.nodes.values()].map(x => `<option value="${esc(x.label)}"></option>`).join('')}</datalist>`;
}
const loaded = () => S.loaded && S.nodes.size > 0;

$('#panel').addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]'); if (go) { select(go.dataset.go, { pan: true }); return; }
  if (ev.target.closest('[data-close]')) { endTour(); if (S.sel) clearSel(); else { S.intro = false; renderPanel(); } return; }
  if (ev.target.closest('[data-showmap]')) { const id = S.sel; setView('map'); setTimeout(() => select(id, { pan: true }), 30); }
});
$('#panel').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target, msg = f.querySelector('[data-msg]'), btn = f.querySelector('button[type=submit]');
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle('err', !!err); };
  if (!S.db) return;
  btn.disabled = true;
  try {
    if (f.dataset.form === 'note') {
      const text = f.text.value.trim(); if (!text) { btn.disabled = false; return; }
      await S.db.collection('notes').add({ node: S.sel, text, time: new Date().toISOString() });
      say('Lagret.');
    } else if (f.dataset.form === 'edge') {
      const name = f.to.value.trim();
      const target = [...S.nodes.values()].find(x => x.label.toLowerCase() === name.toLowerCase() || x.id === name);
      if (!target) { say('Fant ikke det stedet. Velg et navn fra lista.', true); btn.disabled = false; return; }
      const src = S.nodes.get(S.sel);
      const links = [...(src.raw.links || [])];
      const l = { rel: f.rel.value, to: target.id }; const note = f.note.value.trim(); if (note) l.note = note;
      links.push(l);
      // every change is logged on the place, oldest first
      const changes = [...(src.raw.changes || []), { date: new Date().toLocaleDateString('sv-SE'), text: `Ny kobling: ${PRED[l.rel][0].toLowerCase()} «${target.label}».`, fields: ['links'] }];
      await S.db.doc('nodes/' + src.id).update({ links, changes });
      say('Koblingen er lagt til.');
    }
  } catch (err) {
    say(writeError(err), true);
    if (err && err.code === 'invalid_argument') S.writer = false;
  }
  btn.disabled = false;
});
function writeError(err) {
  const c = err && err.code;
  if (c === 'quota_exceeded') return 'Kartets database er full. Slett noe før du legger til mer.';
  if (c === 'invalid_argument') return 'Du har ikke tilgang til å endre kartet.';
  if (c === 'unavailable' || c === 'resource_exhausted') return 'Kunne ikke lagre akkurat nå. Prøv igjen om litt.';
  return 'Kunne ikke lagre. Prøv igjen senere.';
}
