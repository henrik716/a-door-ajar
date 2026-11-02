'use strict';

/* ───────── Patterns ───────── */
function renderPatterns() {
  const V = $('#v-patterns');
  if (!loaded()) { V.innerHTML = `<div class="page"><h2>Mønstre</h2><p class="lead">${S.loaded ? 'Kartet er tomt ennå.' : 'Henter kartet …'}</p></div>`; return; }
  const nodes = [...S.nodes.values()];
  const N = id => S.nodes.get(id);
  const list = ids => [...ids].filter(N).map(id => lnk(id)).join(', ');
  const byStr = (a, b) => (STRENGTH_RANK[N(a).strength] ?? 5) - (STRENGTH_RANK[N(b).strength] ?? 5);

  // 1 shared premises
  const dep = new Map();
  for (const e of S.edges) if (e.p === 'presupposes') { if (!dep.has(e.o)) dep.set(e.o, new Set()); dep.get(e.o).add(e.s); }
  const theses = [...dep.entries()].filter(([, s]) => s.size >= 2).sort((a, b) => b[1].size - a[1].size);
  const forCards = theses.map(([x, s]) => {
    const mot = S.edges.filter(e => e.o === x && e.p === 'contradicts').map(e => e.s);
    const st = S.edges.filter(e => e.o === x && e.p === 'supports').map(e => e.s);
    return `<div class="card"><h4><button type="button" data-go="${esc(x)}">${esc(N(x).label)}</button></h4>
      <p class="sub">${s.size} steder hviler på denne antakelsen.</p>
      <div class="lab">Hviler på den</div><div>${list(s)}</div>
      ${st.length ? `<div class="lab">Støttes av</div><div>${list(st)}</div>` : ''}
      ${mot.length ? `<div class="lab c">Motsies av</div><div>${list(mot)}</div>` : ''}</div>`;
  }).join('');

  // 2 hope levels
  const lvlCards = LEVELS.map(L => {
    const { sup, ctr } = hopeSets(L);
    const s = [...sup].sort(byStr);
    const best = s.find(id => N(id).strength && !N(id).own && N(id).strength !== 'image');
    return `<div class="card lvl" style="--lc: var(--h${L})"><h4>${L} · ${esc(HOPE[L].l)}</h4>
      <p class="sub">${s.length} steder peker hit. Sterkeste grunnlag: <b>${best ? STRENGTH[N(best).strength].toLowerCase() : 'ingen'}</b>.</p>
      <div class="lab">Peker hit</div><div>${s.map(id => lnk(id) + (N(id).strength ? ` <span class="sty">${STRENGTH[N(id).strength].toLowerCase()}</span>` : '')).join(', ')}</div>
      ${ctr.size ? `<div class="lab c">Står imot</div><div>${list(ctr.keys())}</div>` : ''}</div>`;
  }).join('');

  // 3 the words
  const ords = nodes.filter(n => n.type === 'word');
  const ordCards = ords.map(o => {
    const used = S.edges.filter(e => e.o === o.id && e.p === 'usesWord').map(e => e.s);
    const ch = S.edges.filter(e => e.o === o.id && e.p === 'challengesWord').map(e => e.s);
    return `<div class="card"><h4><button type="button" data-go="${esc(o.id)}" style="font-style:italic">${esc(o.label)}</button></h4>
      <p class="sub">Brukt i ${used.length} spørsmål, utfordret fra ${ch.length} kanter.</p>
      ${used.length ? `<div class="lab">Brukes i</div><div>${list(used)}</div>` : ''}
      ${ch.length ? `<div class="lab">Utfordres av</div><div>${list(ch)}</div>` : ''}</div>`;
  }).join('');
  const multi = nodes.map(n => ({ n, c: S.edges.filter(e => e.s === n.id && e.p === 'challengesWord').map(e => e.o) })).filter(x => x.c.length >= 2)
    .sort((a, b) => b.c.length - a.c.length);

  // 4 derived
  const dSent = S.derived.filter(d => d.p === 'challengesDerived' || d.p === 'strengthensDerived').map(d => {
    const verb = d.p === 'challengesDerived' ? "utfordrer" : "styrker";
    const rel = d.p === 'challengesDerived' ? "motsier" : "støtter";
    return `<li>${lnk(d.s)} ${verb} ${lnk(d.o)}, fordi ${esc(N(d.o).short || N(d.o).label)} forutsetter ${lnk(d.via, 'via')}, som ${esc(N(d.s).short || N(d.s).label)} ${rel}.</li>`;
  }).join('');
  const kq = new Map();
  for (const d of S.derived) if (d.p === 'mayDissolveDerived') { if (!kq.has(d.o)) kq.set(d.o, new Map()); const m = kq.get(d.o); if (!m.has(d.via)) m.set(d.via, []); m.get(d.via).push(d.s); }
  const kqHTML = [...kq.entries()].map(([q, m]) => `<li>${lnk(q)} kan kanskje oppløses av ${[...m.entries()].map(([w, ps]) => `${list(ps)} (ordet «${esc(N(w).label)}»)`).join('; ')}.</li>`).join('');

  // 5 crossroads
  const cross = nodes.map(n => {
    const regs = new Set();
    for (const e of S.edges) { if (e.p === 'behind') continue; if (e.s === n.id) regs.add(N(e.o).region); if (e.o === n.id) regs.add(N(e.s).region); }
    regs.delete(n.region);
    return { n, regs };
  }).filter(x => x.regs.size >= 3).sort((a, b) => b.regs.size - a.regs.size).slice(0, 14);
  const crossHTML = cross.map(x => `<li>${lnk(x.n.id)} <span class="sty">${esc(REGION[x.n.region].label)}</span> kobler til ${x.regs.size} andre områder: <span class="rtags">${[...x.regs].map(r => `<span>${esc(REGION[r].label)}</span>`).join('')}</span></li>`).join('');

  const fronts = nodes.filter(n => n.status === 'frontier'), plan = nodes.filter(n => n.status === 'planned');
  const chosen = new Set(S.status && Array.isArray(S.status.next) ? S.status.next : []);
  const openRef = n => nref(n.id, chosen.has(n.id) ? 'Der vi graver videre' : '');

  V.innerHTML = `<div class="page">
    <h2>Mønstre</h2>
    <p class="lead">Det kartet viser når man ser på koblingene samlet. Noe av dette er utledet med fire enkle regler, ikke tegnet for hånd. Reglene står i Eksport.</p>

    <div class="msect"><h3>Felles forutsetninger</h3><p>Steder som hviler på den samme antakelsen, står og faller delvis sammen. Her ser man hvilke antakelser som bærer mest.</p></div>
    <div class="cards">${forCards}</div>

    <div class="msect"><h3>Veier til hvert håpsnivå</h3><p>Hva som peker mot hvert nivå, hvor godt det står, og hva som står imot. Det samme som Håp-linsen i kartet. Nivå 1 og 2 handler om det som er igjen i verden og i deg. Nivå 3 til 6 er ikke en stige, men fire ruter: om perspektivet er hans, og om innholdet blir med.</p><div style="max-width:440px">${hopeGridHTML(0)}${hopeExplainHTML(0, true)}</div></div>
    <div class="cards">${lvlCards}</div>

    <div class="msect"><h3>Ordene</h3><p>Hvilke spørsmål som er bygget av hvilke ord, og hvem som har utfordret ordene.</p></div>
    <div class="cards">${ordCards}</div>
    ${multi.length ? `<ul class="sentences">${multi.map(x => `<li>${lnk(x.n.id)} utfordrer ${x.c.length} ord på én gang: ${x.c.map(id => `<i>${esc(N(id).label)}</i>`).join(', ')}.</li>`).join('')}</ul>` : ''}

    <div class="msect"><h3>Utledede motsigelser og styrkinger</h3><p>Hvis A forutsetter X, og B motsier X, utfordrer B også A. Ingen av disse er tegnet direkte.</p></div>
    <ul class="sentences">${dSent}</ul>
    <div class="msect"><h3>Spørsmål som kanskje kan oppløses</h3><p>Hvis et spørsmål bruker et ord, og noe utfordrer det ordet, kan det kanskje oppløse spørsmålet. Kandidater, ikke konklusjoner.</p></div>
    <ul class="sentences">${kqHTML}</ul>

    <div class="msect"><h3>Skjæringspunkter</h3><p>Steder som binder sammen mange områder. Det er ofte her uventede sammenhenger ligger.</p></div>
    <ul class="sentences">${crossHTML}</ul>

    <div class="msect"><h3>Våre egne slutninger</h3><p>Det vi har kommet fram til selv i samtalene, sortert etter hva det bygger på. Ingen fagfolk har vurdert dette, så det er her det er mest å etterprøve.</p></div>
    <div class="cards">${['solid', 'supported', 'position', 'contested'].map(s => { const g = nodes.filter(n => n.own && n.strength === s); return g.length ? `<div class="card"><h4>${BASIS[s]}</h4><p class="sub">${g.length} steder</p><div class="rlist">${g.map(n => nref(n.id)).join('')}</div></div>` : ''; }).join('')}</div>

    <div class="msect" id="open-places"><h3>Åpne steder</h3><p>Alt kartet ikke er ferdig med. Fronten er der vi har gravd og funnet at det fortsatt er åpent. Resten er spørsmål vi har reist, men ikke gravd i ennå. De som er merket «Der vi graver videre», er dem vi har valgt å gå videre med nå.</p></div>
    <div class="cards"><div class="card"><h4>Fronten</h4><p class="sub">Gravd i, fortsatt åpent · ${fronts.length} steder</p><div class="rlist">${fronts.map(openRef).join('')}</div></div>
    <div class="card"><h4>Ikke gravd ennå</h4><p class="sub">${plan.length} steder</p><div class="rlist">${plan.map(openRef).join('')}</div></div></div>
  </div>`;
}
$('#v-patterns').addEventListener('click', ev => { const go = ev.target.closest('[data-go]'); if (go) select(go.dataset.go); });
