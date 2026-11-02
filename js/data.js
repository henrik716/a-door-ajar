'use strict';

/* ───────── Data in ───────── */
function ingest(docs) {
  const m = new Map(), gone = new Map();
  for (const doc of docs) {
    if (!doc.exists) continue;
    const r = doc.data() || {};
    // a retired place is no longer part of the map; its address leads to what replaced it
    if (r.retired) { gone.set(doc.id, { label: tx(r.label), ...r.retired }); continue; }
    if (!tx(r.label) || !TYPE[r.type]) continue;
    m.set(doc.id, {
      id: doc.id, type: r.type, region: REGION[r.region] ? r.region : 'core', label: tx(r.label), short: tx(r.short),
      text: tx(r.text), strength: STRENGTH[r.strength] ? r.strength : null,
      hope: Array.isArray(r.hope) ? r.hope.filter(h => h >= 1 && h <= 6) : [],
      status: r.status === 'frontier' || r.status === 'planned' ? r.status : null,
      answer: tx(r.answer), conversation: r.conversation || 'deepdive',
      sources: Array.isArray(r.sources) ? r.sources : [], links: Array.isArray(r.links) ? r.links : [],
      added: r.added || '', changes: Array.isArray(r.changes) ? r.changes.filter(c => c && c.date) : [], raw: r, own: r.own === true,
    });
  }
  S.nodes = m;
  S.retired = gone;
  const E = [];
  for (const n of m.values()) for (const l of n.links) {
    if (l && PRED[l.rel] && m.has(l.to) && l.to !== n.id) E.push({ s: n.id, p: l.rel, o: l.to, m: tx(l.note) });
  }
  S.edges = E;
  S.derived = derive(E);
  S.loaded = true;
  layout();
  renderAll();
}

// Where the address of a retired place leads: what replaced it, following the chain, or null.
function replacement(id) {
  const seen = new Set();
  while (S.retired.has(id) && !seen.has(id)) { seen.add(id); id = S.retired.get(id).replacedBy; }
  return id && S.nodes.has(id) ? id : null;
}

function derive(E) {
  const by = p => E.filter(e => e.p === p);
  const key = new Set(E.map(e => e.s + '|' + e.p + '|' + e.o));
  const has = (s, p, o) => key.has(s + '|' + p + '|' + o);
  const out = new Map(); // one derivation per pair and rule, even when several paths lead to it
  const add = (s, p, o, via) => { const k = s + '|' + p + '|' + o; if (!out.has(k)) out.set(k, { s, p, o, via, vias: [via] }); else out.get(k).vias.push(via); };
  const pre = by('presupposes'), con = by('contradicts'), sup = by('supports'), qua = by('qualifies');
  for (const f of pre) {
    for (const c of con) if (c.o === f.o && c.s !== f.s && !has(c.s, 'contradicts', f.s)) add(c.s, 'challengesDerived', f.s, f.o);
    for (const g of pre) if (g.o === f.o && g.s > f.s) add(f.s, 'sharesPremiseWith', g.s, f.o);
    for (const q of qua) if (q.o === f.o && q.s !== f.s && !has(q.s, 'qualifies', f.s) && !has(q.s, 'contradicts', f.s)) add(q.s, 'qualifiesDerived', f.s, f.o);
  }
  // R2: B strengthens A only if B does not also contradict another premise of A
  for (const f of pre) for (const st of sup) {
    if (st.o !== f.o || st.s === f.s || has(st.s, 'supports', f.s) || has(st.s, 'contradicts', f.s)) continue;
    if (out.has(st.s + '|challengesDerived|' + f.s)) continue;
    add(st.s, 'strengthensDerived', f.s, f.o);
  }
  // R4: only questions can be dissolved
  const uses = by('usesWord'), chal = by('challengesWord');
  for (const b of uses) {
    const q = S.nodes.get(b.s); if (!q || q.type !== 'question') continue;
    for (const u of chal) if (u.o === b.o && u.s !== b.s && !has(u.s, 'dissolves', b.s)) add(u.s, 'mayDissolveDerived', b.s, b.o);
  }
  return [...out.values()];
}
