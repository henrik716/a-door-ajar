'use strict';

/* ───────── Lenses ───────── */
function hopeSets(L) {
  const sup = new Set([...S.nodes.values()].filter(n => n.hope.includes(L)).map(n => n.id));
  const ctr = new Map();
  const add = (id, via) => { if (!sup.has(id)) { if (!ctr.has(id)) ctr.set(id, new Set()); ctr.get(id).add(via); } };
  for (const e of S.edges) if ((e.p === 'contradicts' || e.p === 'qualifies') && sup.has(e.o)) add(e.s, e.o);
  for (const d of S.derived) if (d.p === 'challengesDerived' && sup.has(d.o)) add(d.s, d.o);
  return { sup, ctr };
}
function wordSets() {
  const users = new Set(), chall = new Set();
  for (const e of S.edges) { if (e.p === 'usesWord') users.add(e.s); if (e.p === 'challengesWord') chall.add(e.s); }
  return { users, chall };
}
function applyLens() {
  const el = svg.node();
  el.classList.toggle('lens-words', S.lens === 'words');
  el.classList.toggle('lens-hope', S.lens === 'hope');
  el.classList.toggle('nothinkers', !S.showThinkers);
  el.classList.toggle('narrow', S.lens === 'hope' && S.hope > 0);
  let color = d => `var(--t-${d.type})`, dim = () => false, hl = () => false, ctr = () => false;
  edgeSel.classed('lens-on', false);
  if (S.lens === 'hope') {
    if (S.hope) {
      const { sup, ctr: C } = hopeSets(S.hope);
      color = d => sup.has(d.id) ? `var(--h${S.hope})` : C.has(d.id) ? 'var(--ctr)' : 'var(--ink-3)';
      dim = d => !sup.has(d.id) && !C.has(d.id);
      hl = d => sup.has(d.id); ctr = d => C.has(d.id);
      edgeSel.classed('lens-on', d => (sup.has(d.s) || C.has(d.s)) && (sup.has(d.o) || C.has(d.o)));
    } else {
      color = d => d.hope.length ? `var(--h${Math.max(...d.hope)})` : 'var(--ink-3)';
      dim = d => !d.hope.length; hl = d => d.hope.length > 0;
      edgeSel.classed('lens-on', d => d.source.hope.length && d.target.hope.length);
    }
  } else if (S.lens === 'evidence') {
    color = d => d.own ? 'var(--e-own)' : d.strength ? `var(--e-${d.strength})` : 'var(--ink-3)';
    dim = d => !d.strength && d.type !== 'question';
  } else if (S.lens === 'words') {
    const { users, chall } = wordSets();
    color = d => d.type === 'word' ? 'var(--t-word)' : users.has(d.id) ? 'var(--violet)' : chall.has(d.id) ? 'var(--ink)' : 'var(--ink-3)';
    dim = d => d.type !== 'word' && !users.has(d.id) && !chall.has(d.id);
    hl = d => users.has(d.id) || chall.has(d.id);
  }
  nodeSel.style('--c', color).classed('dim', dim).classed('hl', hl).classed('ctr', ctr);
  renderLegend();
  declutter();
}
